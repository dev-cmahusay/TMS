export interface ErrorMeta {
	ticketRef?: string;
	statusCode?: number;
	code?: string;
	action?: string;
}

/**
 * Logs operational errors with minimal metadata (never PII, email bodies, or secrets).
 */
export function logError(context: string, err: unknown, meta: ErrorMeta = {}): void {
	const message = err instanceof Error ? err.message : String(err);
	console.error(
		JSON.stringify({
			level: 'error',
			context,
			message,
			...meta,
			timestamp: new Date().toISOString()
		})
	);
}
