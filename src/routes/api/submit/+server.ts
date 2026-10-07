import type { RequestHandler } from './$types';
import { error, json, redirect } from '@sveltejs/kit';
import {FieldValue} from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import { adminDB } from '$lib/server/admin';
import { getLevels, normaliseAnswer, unlockedLevels } from '$lib/server/levels';
import { hasEnded, hasStarted } from '$lib/event';

// entries kept in a team's log document for the "prev answers" list; every
// attempt is also stored in logs/{team}/attempts, which only the server reads
const LOG_ENTRIES_SHOWN = 200;

export const POST: RequestHandler = async ({ request, locals }) => {
    if(locals.userTeam === null || !locals.userExists || locals.userID === null) return redirect(302,"/ready");
    if(!hasStarted()) error(403, "The game hasn't started yet");
    if(hasEnded()) error(403, "The game is over");

    const {questionId, answer} = await request.json();
    if(typeof answer !== "string" || answer.trim() === "") error(400,"Bad Request");
    const levels = await getLevels();
    const level = levels.find((l) => l.uid === questionId);
    if(!level) error(404,"Not Found");

    const guessesPerMinute = Number(env.GUESSES_PER_MINUTE) || 10;
    const entered = answer.toLowerCase();
    const correct = normaliseAnswer(entered) === normaliseAnswer(level.answer);
    const teamRef = adminDB.collection("teams").doc(locals.userTeam!);
    const logRef = adminDB.collection("logs").doc(locals.userTeam!);

    const result = await adminDB.runTransaction(async (transaction) => {
        const team = (await transaction.get(teamRef)).data();
        const log = (await transaction.get(logRef)).data();
        if(!team) error(500,"Something went wrong");
        const completed: string[] = team.completed_levels || [];
        if(completed.includes(level.uid)) return { correct: true };
        // only the team's current level can be answered, so levels can't be skipped
        if(!unlockedLevels(levels, completed).some((l) => l.uid === level.uid)) error(403,"That level is still locked");

        const now = Date.now();
        // wrong guesses in the last minute, per team, to slow down brute forcing
        const recent: number[] = (log?.recent_wrong || []).filter((t: number) => now - t < 60_000);
        if(!correct && recent.length >= guessesPerMinute) return { limited: true };

        const entry = {
            "timestamp": now,
            "questionId": level.uid,
            "type": correct ? "correct_answer" : "wrong_answer",
            "entered": entered,
            "userId": locals.userID!,
        };
        if(correct){
            // as before, only verified teams move up the leaderboard
            transaction.update(teamRef,{
                "completed_levels": FieldValue.arrayUnion(level.uid),
                "level": team.iitm_verified ? team.level + 1 : team.level,
                "last_change": FieldValue.serverTimestamp()
            });
        }
        transaction.set(logRef,{
            count: (log?.count || 0) + 1,
            logs: [...(log?.logs || []), entry].slice(-LOG_ENTRIES_SHOWN),
            recent_wrong: correct ? recent : [...recent, now],
        },{merge: true});
        transaction.create(logRef.collection("attempts").doc(), entry);
        return { correct };
    });

    if("limited" in result) error(429,"Too many guesses, wait a minute");
    return json(result);
};
