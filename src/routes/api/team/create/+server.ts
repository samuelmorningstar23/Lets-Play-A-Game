import type { RequestHandler } from './$types';
import { adminDB,adminAuth } from '$lib/server/admin';
import {FieldValue} from 'firebase-admin/firestore';
import * as referralCodes from 'referral-codes';
import { error, json } from '@sveltejs/kit';
import { announce, hasWebhook } from '$lib/server/webhook';
import { isVerifiedEmail } from '$lib/event';

const indexRef = adminDB.collection("index").doc('nameIndex');
const userIndexRef = adminDB.collection("index").doc("userIndex");
const newCode = () => referralCodes.generate({ length: 8, count: 1 })[0].toLowerCase();

export const POST: RequestHandler = async ({ request, locals }) => {
    if(locals.userID === null || !locals.userExists) error(401, 'Unauthorized');
    const body = await request.json();
    const teamName = typeof body.teamName === 'string' ? body.teamName.trim().toLowerCase() : '';
    if(!/^[a-z0-9 ]{1,30}$/.test(teamName)) error(400,"Bad Request");
    const userRecord = await adminAuth.getUser(locals.userID!);

    await adminDB.runTransaction(async (transaction) => {
        const userRef = adminDB.collection('users').doc(locals.userID!);
        // read inside the transaction, so names and codes stay unique across server instances
        const user = (await transaction.get(userRef)).data();
        const index = (await transaction.get(indexRef)).data();
        if(!user || user.team !== null || !index) error(401, 'Unauthorized');
        if(index.teamnames.includes(teamName)) error(429,"Team name is already taken");

        const newTeamRef = adminDB.collection('teams').doc();
        const teamID = newTeamRef.id;
        let teamCode = newCode();
        while(Object.hasOwn(index.teamcodes || {}, teamCode)) teamCode = newCode();
        transaction.set(newTeamRef,{
            created: FieldValue.serverTimestamp(),
            last_change: FieldValue.serverTimestamp(),
            teamName,
            uid: teamID,
            code: teamCode,
            owner: locals.userID,
            members: [locals.userID],
            level: 1,
            banned: false,
            iitm_verified: isVerifiedEmail(userRecord.email),
        });
        transaction.update(userRef,{ team: teamID });
        transaction.update(indexRef,{
            teamnames: FieldValue.arrayUnion(teamName),
            ['teamcodes.'+teamCode]: teamID,
            ['teamcounts.'+teamCode]: [locals.userID],
        });
        transaction.update(userIndexRef,{ [locals.userID!]: teamID });
    });

    if(hasWebhook()){
        const count = (await adminDB.collection('teams').count().get()).data().count;
        await announce("**New Team**\nName: "+teamName+"\nTeam Count: "+count);
    }
    return json({success: true});
};
