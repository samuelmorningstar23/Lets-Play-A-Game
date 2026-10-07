import { env } from '$env/dynamic/private';
import axios from 'axios';

export const hasWebhook = () => Boolean(env.WEBHOOK);

/** Posts to the Discord webhook in WEBHOOK, if set. Never throws. */
export async function announce(content: string) {
    if (!env.WEBHOOK) return;
    try {
        await axios.post(env.WEBHOOK, { content });
    } catch (e) {
        console.error(e);
    }
}
