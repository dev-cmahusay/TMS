export function formatDuration(seconds: number | null | undefined): string {
	if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
		return '—';
	}

	const totalMinutes = Math.round(seconds / 60);
	if (totalMinutes < 60) {
		return `${totalMinutes}m`;
	}

	const totalHours = Math.floor(totalMinutes / 60);
	const remainingMinutes = totalMinutes % 60;

	if (totalHours < 24) {
		return `${totalHours}h ${remainingMinutes}m`;
	}

	const days = Math.floor(totalHours / 24);
	const remainingHours = totalHours % 24;
	return `${days}d ${remainingHours}h`;
}
