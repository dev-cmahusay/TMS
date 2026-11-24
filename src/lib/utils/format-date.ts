const MANILA_TIMEZONE = 'Asia/Manila';

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
	timeZone: MANILA_TIMEZONE,
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	hour12: true
});

export function formatManilaDateTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return dateTimeFormatter.format(date);
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;

	const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
	if (diffSeconds < 60) return 'Just now';

	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) return `${diffMinutes}m ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return formatManilaDateTime(iso);
}
