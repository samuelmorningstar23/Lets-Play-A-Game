import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { env } from "$env/dynamic/public";

const useEmulators = env.PUBLIC_USE_EMULATORS === "true";

// The web app config from Firebase console -> Project settings -> Your apps.
// None of it is secret: access is controlled by sign-in and firestore.rules.
const firebaseConfig = useEmulators
  ? {
      // local emulators: a "demo-" project id never touches a real Firebase project
      apiKey: "demo-api-key",
      authDomain: "demo-lets-play.firebaseapp.com",
      projectId: "demo-lets-play",
      storageBucket: "demo-lets-play.appspot.com",
    }
  : {
      apiKey: env.PUBLIC_FIREBASE_API_KEY,
      authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.PUBLIC_FIREBASE_APP_ID,
    };

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
