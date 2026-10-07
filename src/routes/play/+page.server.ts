import {redirect} from "@sveltejs/kit";
import {adminDB}  from "@/server/admin";
import {getLevels, unlockedLevels, withoutAnswer} from "@/server/levels";
import {hasEnded, hasStarted} from "$lib/event";

/** @type {import('./$types').PageLoad} */
export const load
    = (async ({ locals }) => {
    if(locals.banned){
        return redirect(302,"/team");
    }
    if(locals.userID === null || locals.userID === undefined || locals.userExists === false || locals.userTeam === null || locals.userTeam === undefined) return redirect(302,"/ready");
    // the home page counts down to the start
    if(!hasStarted()) return redirect(302,"/");

    const levels = await getLevels();
    const team = (await adminDB.collection("teams").doc(locals.userTeam).get()).data();
    // only levels the team has reached, so later puzzles can't be read early
    const questions = unlockedLevels(levels, team?.completed_levels || []).map(withoutAnswer);
    return {
        locals,
        questions,
        total: levels.length,
        ended: hasEnded(),
    };
});
