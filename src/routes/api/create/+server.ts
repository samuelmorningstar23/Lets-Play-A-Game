import type { RequestHandler } from './$types';
import { adminDB } from '$lib/server/admin';
import {FieldValue} from 'firebase-admin/firestore';
import { error, json } from '@sveltejs/kit';
import { announce, hasWebhook } from '$lib/server/webhook';

const indexRef = adminDB.collection("index").doc('nameIndex');

export const POST: RequestHandler = async ({ request, locals }) => {
    if(locals.userID === null) error(401, 'Unauthorized');
    const {first, last, username} = await request.json();
    const name = typeof username === 'string' ? username.toLowerCase() : '';
    if(typeof first !== 'string' || typeof last !== 'string' || !first.trim() || !last.trim()
        || first.length > 50 || last.length > 50 || !/^[a-z0-9]{1,30}$/.test(name)){
        error(400, 'Invalid request');
    }

    const userRef = adminDB.collection('users').doc(locals.userID!);
    await adminDB.runTransaction(async (transaction) => {
        // checked inside the transaction, so two server instances can't give out the same name
        const index = (await transaction.get(indexRef)).data();
        if((await transaction.get(userRef)).exists) error(400, 'Account already exists');
        if(index?.usernames?.includes(name)) error(409, 'Username already exists');
        transaction.set(userRef,{
            first,
            last,
            username: name,
            team: null,
            uid: locals.userID,
            created: FieldValue.serverTimestamp(),
        });
        transaction.update(indexRef,{
            usernames: FieldValue.arrayUnion(name)
        });
        transaction.update(adminDB.collection('index').doc('userIndex'),{
            [locals.userID!]: null
        });
    });

    if(hasWebhook()){
        const count = (await adminDB.collection('users').count().get()).data().count;
        await announce("**New User**\nName: "+first+" "+last+"\nUsername: "+name+"\nUser Count: "+count);
    }
    return json({success: true});
};
