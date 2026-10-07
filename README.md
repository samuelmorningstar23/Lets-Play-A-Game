# Let's Play a Game

An online cryptic hunt. Players sign in with Google, form teams of up to three, solve levels in order, and race each other up a live leaderboard.

## Features
- Google sign-in, and teams of up to 3 joined with an invite code
- Levels with text, images, files and clues hidden in the page's HTML comments
- Players only ever receive the levels their team has reached, never answers
- Live team page, leaderboard, and each team's answer history
- Optional prize eligibility by email domain (e.g. only `iitm.ac.in` teams score)
- Start and end times, with a countdown on the home page
- Per-team limit on wrong guesses, to slow down brute forcing
- Optional Discord announcements of new players and teams, and Sentry error reporting

Built with SvelteKit (deployed on Vercel) and Firebase Authentication + Cloud Firestore.

## Run it locally
No accounts needed: sign-in and the database run on the Firebase emulators, with sample levels from `seed/levels.json`.

Requirements: Node.js 20+ and Java 21+ (`java -version`).

```
npm install
npm run local
```

Open http://localhost:5173. "sign in with google" opens the emulator's sign-in popup: click *Add new account* and type any email. Sign in with another email in a private window to test joining a team. The emulator dashboard at http://127.0.0.1:4000 shows all data, which is wiped when you stop `npm run local`.

If the popup closes but the page stays on "create your account", reload and sign in again (the popup loads a script from Google, so you need internet access).

## Launch it

### 1. Firebase
1. Create a project at https://console.firebase.google.com.
2. **Authentication → Sign-in method**: enable **Google**.
3. **Firestore Database → Create database**: production mode, in a location near your players (e.g. `asia-south1`, Mumbai).
4. **Project settings → General → Your apps → Web**: register an app. Its config values are the `PUBLIC_FIREBASE_*` settings.
5. **Project settings → Service accounts → Generate new private key**. This file is a secret: never commit or share it.

### 2. Rules, indexes and levels
Write your levels in the format below. This repository is public, so **never commit real levels**: files named `*.private.json` are git-ignored.

From GitHub (no tools needed):
1. **Settings → Secrets and variables → Actions → New repository secret**:
   - `FIREBASE_SERVICE_ACCOUNT`: the contents of the key file from step 1.5
   - `LEVELS_JSON`: your levels
2. **Actions → Set up Firebase → Run workflow**. It deploys `firestore.rules` and `firestore.indexes.json`, creates the documents the app needs, and uploads the levels. Run it again whenever levels change.

If the deploy step reports a permission error, give the service account (its email is in the key file) the **Firebase Admin** role in Google Cloud console → IAM.

Or from your computer: put the `FB_*` settings in `.env`, then run `npx firebase login`, `npx firebase deploy --only firestore --project <project-id>` and `npm run upload-levels -- levels.private.json`.

### 3. Vercel
1. Import this repository at https://vercel.com/new.
2. Add the environment variables listed in `.env.example`: the `PUBLIC_FIREBASE_*` values, the service account's `FB_PROJECT_ID`, `FB_CLIENT_EMAIL` and `FB_PRIVATE_KEY` (the whole key, BEGIN and END lines included), and your event settings.
3. Deploy. Changing a setting later needs a redeploy (Deployments → ⋯ → Redeploy).
4. In Firebase, **Authentication → Settings → Authorized domains**: add your Vercel domain (and any custom domain), or Google sign-in will be refused there.

### 4. Before the event
- Do a dry run on the live site with two or three accounts, on phones too.
- Firestore's free tier allows about 50,000 reads a day, and a busy event can use that up. Switching the project to the pay-as-you-go (Blaze) plan with a small budget alert is cheap insurance.

## Running the game
- **Ban a team**: in Firestore, set `banned` to `true` on its document in `teams`.
- **Fix a level**: update your levels and run the workflow again, or edit the level in Firestore. Answers are compared ignoring case and spaces.
- **See every attempt**: each team's full history is in `logs/{team}/attempts`.

## Level format
A JSON array, one object per level (see `seed/levels.json`):

| field | |
|---|---|
| `uid` | unique id: lowercase letters, digits, dashes |
| `level` | order, starting at 0 |
| `prompt` | the question |
| `answer` | case and spaces are ignored |
| `creator` | shown as "question by ..." |
| `comment` | hidden in the page's HTML for players who inspect it |
| `images` | list of image URLs |
| `files` | list of `{ "name", "url" }` |

## Credits and license
Based on the [EncryptID Finale Platform](https://github.com/iitmtechsociety/encryptid-offline) by the COSMOS Tech Society, IIT Madras. Licensed under the GNU GPL 3.0 (see `LICENSE`).
