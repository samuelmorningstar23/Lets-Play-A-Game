// Loads levels into Firestore, and creates the index documents the app needs
// if they don't exist yet. Levels are created or updated, never deleted.
//
//   node scripts/upload-levels.js --emulator seed/levels.json         local emulator (npm run seed)
//   node --env-file=.env scripts/upload-levels.js levels.private.json  your Firebase project
//
// For a real project, credentials come from FB_PROJECT_ID, FB_CLIENT_EMAIL and
// FB_PRIVATE_KEY, or from a service account file in GOOGLE_APPLICATION_CREDENTIALS.
// This repository is public: keep real levels in a *.private.json file (git-ignored)
// or in the LEVELS_JSON secret used by .github/workflows/firebase.yml.
import { readFile } from 'node:fs/promises';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const fail = (message) => {
	console.error(`upload-levels: ${message}`);
	process.exit(1);
};

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const file = args.find((a) => !a.startsWith('--'));
if (!file) fail('usage: node scripts/upload-levels.js [--emulator] <levels.json>');

let projectId;
if (emulator) {
	process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
	projectId = process.env.GCLOUD_PROJECT || 'demo-lets-play';
	initializeApp({ projectId });
} else {
	const { FB_PROJECT_ID, FB_CLIENT_EMAIL, FB_PRIVATE_KEY } = process.env;
	projectId = FB_PROJECT_ID;
	initializeApp({
		credential: FB_PRIVATE_KEY
			? cert({ projectId, clientEmail: FB_CLIENT_EMAIL, privateKey: FB_PRIVATE_KEY.replace(/\\n/g, '\n') })
			: applicationDefault(),
		...(projectId && { projectId })
	});
}
const db = getFirestore();

// --- check the file before touching the database
const normalise = (answer) => answer.toLowerCase().replace(/\s/g, '');
let levels;
try {
	levels = JSON.parse(await readFile(file, 'utf8'));
} catch (e) {
	fail(`can't read ${file}: ${e.message}`);
}
if (!Array.isArray(levels) || levels.length === 0) fail(`${file} should be a JSON array of levels (see seed/levels.json)`);
const uids = new Set();
const numbers = new Set();
levels.forEach((l, i) => {
	const where = `level ${i + 1} in ${file}`;
	if (typeof l.uid !== 'string' || !/^[a-z0-9-]+$/.test(l.uid)) fail(`${where}: "uid" must use only lowercase letters, digits and dashes`);
	if (!Number.isInteger(l.level) || l.level < 0) fail(`${where}: "level" must be a whole number, 0 for the first level`);
	if (typeof l.prompt !== 'string' || !l.prompt.trim()) fail(`${where}: "prompt" is missing`);
	if (typeof l.answer !== 'string' || !normalise(l.answer)) fail(`${where}: "answer" is missing`);
	if (uids.has(l.uid)) fail(`${where}: uid "${l.uid}" is used twice`);
	if (numbers.has(l.level)) fail(`${where}: level number ${l.level} is used twice`);
	uids.add(l.uid);
	numbers.add(l.level);
});

// --- write
const indexDocs = {
	userIndex: { '0': null },
	nameIndex: { teamcodes: {}, teamcounts: {}, teamnames: [], usernames: [] }
};
for (const [id, data] of Object.entries(indexDocs)) {
	try {
		// create() fails if the doc exists, so players' data is never overwritten
		await db.collection('index').doc(id).create(data);
		console.log(`created index/${id}`);
	} catch (e) {
		if (e.code !== 6) throw e; // 6 = ALREADY_EXISTS
	}
}

const batch = db.batch();
for (const l of levels) {
	batch.set(db.collection('levels').doc(l.uid), {
		uid: l.uid,
		level: l.level,
		creator: l.creator || 'anonymous',
		prompt: l.prompt,
		answer: normalise(l.answer),
		comment: l.comment || '',
		images: l.images || [],
		files: l.files || []
	});
}
await batch.commit();

const extra = (await db.collection('levels').get()).docs.map((d) => d.id).filter((id) => !uids.has(id));
const target = emulator ? `the emulator (${projectId})` : `project ${projectId || '(from credentials)'}`;
console.log(`uploaded ${levels.length} levels to ${target}`);
if (extra.length) console.log(`note: these levels exist in Firestore but not in ${file}, and were left alone: ${extra.join(', ')}`);
