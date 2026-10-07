import type { RequestHandler } from './$types';
import {adminAuth, adminDB} from '$lib/server/admin';
import {FieldValue} from 'firebase-admin/firestore';
import { error, json } from '@sveltejs/kit';
import { isVerifiedEmail } from '$lib/event';

const MAX_MEMBERS = 3;
const indexRef = adminDB.collection("index").doc('nameIndex');
const userIndexRef = adminDB.collection("index").doc("userIndex");

export const POST: RequestHandler = async ({ request, locals }) => {
    if(locals.userID === null || !locals.userExists) error(401, 'Unauthorized');
    const body = await request.json();
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim().toLowerCase() : '';
    if(!/^[a-z0-9]{1,16}$/.test(inviteCode)) error(400,"Bad Request");
    const userRecord = await adminAuth.getUser(locals.userID!);

    const teamID = await adminDB.runTransaction(async (transaction) => {
        // everything is read inside the transaction, so two people can't both
        // take the last seat on a team
        const index = (await transaction.get(indexRef)).data();
        const teamID = Object.hasOwn(index?.teamcodes || {}, inviteCode) ? index!.teamcodes[inviteCode] : null;
        if(typeof teamID !== 'string') error(404,"Not Found");
        const teamRef = adminDB.collection('teams').doc(teamID);
        const userRef = adminDB.collection('users').doc(locals.userID!);
        const team = (await transaction.get(teamRef)).data();
        const user = (await transaction.get(userRef)).data();
        if(!team) error(404,"Not Found");
        if(team.members.includes(locals.userID)) error(418,"Already in this team");
        if(team.members.length >= MAX_MEMBERS) error(419,"Team is full");
        if(!user || user.team !== null) error(403,"Already in a team");

        transaction.update(teamRef,{
            members: FieldValue.arrayUnion(locals.userID),
            ...(!isVerifiedEmail(userRecord.email) && { iitm_verified: false }),
        });
        transaction.update(userRef,{ team: teamID });
        transaction.update(userIndexRef,{ [locals.userID!]: teamID });
        transaction.update(indexRef,{ [`teamcounts.${inviteCode}`]: FieldValue.arrayUnion(locals.userID) });
        return teamID;
    });
    return json({success: true, teamID});
};
