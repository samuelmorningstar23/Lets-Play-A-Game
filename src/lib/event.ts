// Event settings, from environment variables (see .env.example), so running a
// new edition of the game never needs a code change. Used on server and client.
import { env } from '$env/dynamic/public';

function time(name: string) {
	const value = (env as Record<string, string | undefined>)[name];
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		console.warn(`${name} is not a valid date ("${value}"), ignoring it`);
		return null;
	}
	return date;
}

export const eventName = env.PUBLIC_EVENT_NAME || "let's play a game";
/** When levels open; null means they are open now. */
export const eventStart = time('PUBLIC_EVENT_START');
/** When answers close; null means they never do. */
export const eventEnd = time('PUBLIC_EVENT_END');
export const discordUrl = env.PUBLIC_DISCORD_URL || '';

export const hasStarted = () => !eventStart || Date.now() >= eventStart.getTime();
export const hasEnded = () => !!eventEnd && Date.now() >= eventEnd.getTime();

/** Only teams whose members all use this email domain can score; empty means everyone. */
export const verifiedDomain = (env.PUBLIC_VERIFIED_EMAIL_DOMAIN || '').trim().toLowerCase().replace(/^@/, '');

export function isVerifiedEmail(email?: string | null) {
	if (!verifiedDomain) return true;
	const address = (email || '').toLowerCase();
	return address.endsWith('@' + verifiedDomain) || address.endsWith('.' + verifiedDomain);
}

/** Google Calendar link for the start of the event, or '' when there is no start time. */
export function calendarUrl() {
	if (!eventStart) return '';
	const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
	const end = new Date(eventStart.getTime() + 60 * 60 * 1000);
	const params = new URLSearchParams({ action: 'TEMPLATE', text: eventName, dates: `${stamp(eventStart)}/${stamp(end)}` });
	return `https://calendar.google.com/calendar/render?${params}`;
}
