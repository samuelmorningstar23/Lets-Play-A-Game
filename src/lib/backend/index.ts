// What the pages use to talk to the backend: Google sign-in on the client,
// and the SvelteKit /api routes for everything that changes data.
import { base } from '$app/paths';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '$lib/firebase';

export { Doc } from 'sveltefire';
export { default as BackendProvider } from './Provider.svelte';

/** Calls one of the app's /api endpoints. */
export const api = (path: string, init?: RequestInit) => fetch(base + path, init);

export async function signIn() {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const idToken = await credential.user.getIdToken();
    await api('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });
}

export async function signOut() {
    await api('/api/auth', { method: 'DELETE' });
    await firebaseSignOut(auth);
}
