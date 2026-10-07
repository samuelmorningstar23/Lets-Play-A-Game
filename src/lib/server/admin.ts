import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import pkg from 'firebase-admin';

// firebase-admin picks up the emulators from process.env, which Vite does not
// fill from .env files, so copy the hosts across when they are set there.
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
}
const useEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);

function options() {
    // the emulators need no credentials, only a project id
    if (useEmulators) return { projectId: env.FB_PROJECT_ID || 'demo-lets-play' };
    if (!env.FB_PRIVATE_KEY) {
        // still start (so builds work before the secrets are set); Firebase calls fail until they are
        console.error('Firebase Admin: FB_PROJECT_ID, FB_CLIENT_EMAIL and FB_PRIVATE_KEY are not set, see .env.example');
        return { projectId: env.FB_PROJECT_ID };
    }
    return {
        credential: pkg.credential.cert({
            projectId: env.FB_PROJECT_ID,
            clientEmail: env.FB_CLIENT_EMAIL,
            // pasted keys often arrive with literal \n instead of line breaks
            privateKey: env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    };
}

try {
    pkg.initializeApp(options());
} catch (err) {
    if (!/already exists/u.test((err as Error).message)) {
        console.error('Firebase Admin Error: ', (err as Error).stack)
    }
}


export const adminDB = getFirestore();
export const adminAuth = getAuth();
