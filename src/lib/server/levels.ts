import { adminDB } from './admin';

export type Level = {
    uid: string;
    level: number;
    creator: string;
    prompt: string;
    answer: string;
    comment: string;
    images: string[];
    files: { name: string; url: string }[];
};

let levels: Level[] = [];
let ready: Promise<Level[]> | null = null;

/** All levels in play order, kept in sync with Firestore. */
export function getLevels() {
    ready ??= new Promise((resolve, reject) => {
        adminDB.collection('levels').orderBy('level').onSnapshot(
            (snap) => {
                levels = snap.docs.map((d) => {
                    const data = d.data();
                    return { ...data, uid: d.id, comment: data.comment ?? '', images: data.images ?? [], files: data.files ?? [] } as Level;
                });
                resolve(levels);
            },
            (err) => {
                ready = null; // try again on the next request
                reject(err);
            }
        );
    });
    return ready.then(() => levels);
}

/** What a team may see: every level it has solved, plus the first one it hasn't. */
export function unlockedLevels(all: Level[], completed: string[]) {
    const current = all.findIndex((l) => !completed.includes(l.uid));
    return current === -1 ? all : all.slice(0, current + 1);
}

/** A level as sent to players' browsers: everything but the answer. */
export const withoutAnswer = ({ answer, ...level }: Level) => level;

/** How answers are compared: case and whitespace don't matter. */
export const normaliseAnswer = (answer: string) => answer.toLowerCase().replace(/\s/g, '');
