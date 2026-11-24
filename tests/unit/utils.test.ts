import { describe, expect, it } from 'vitest';
import { getSafeNextUrl } from '../../src/lib/server/safe-redirect';
import { parseTicketFilters } from '../../src/lib/tickets/filters';
import { formatManilaDateTime, formatRelativeTime } from '../../src/lib/utils/format-date';
import { formatDuration } from '../../src/lib/utils/format-duration';
import { maskEmail } from '../../src/lib/utils/mask-email';

describe('utility helpers', () => {
	it('validates post-login next redirect URLs safely', () => {
		expect(getSafeNextUrl('/app/tickets?status=new')).toBe('/app/tickets?status=new');
		expect(getSafeNextUrl('/app')).toBe('/app');
		expect(getSafeNextUrl('https://evil.example')).toBe('/app');
		expect(getSafeNextUrl('//evil.example/app')).toBe('/app');
		expect(getSafeNextUrl('/app-evil')).toBe('/app');
		expect(getSafeNextUrl('/login')).toBe('/app');
	});

	it('parses ticket list filters with safe defaults', () => {
		expect(parseTicketFilters(new URLSearchParams())).toEqual({
			status: 'open',
			mine: false,
			page: 1
		});
		expect(parseTicketFilters(new URLSearchParams('status=bogus&page=-2&mine=1'))).toEqual({
			status: 'open',
			mine: true,
			page: 1
		});
		expect(
			parseTicketFilters(new URLSearchParams('status=waiting_on_customer&page=3'))
		).toEqual({
			status: 'waiting_on_customer',
			mine: false,
			page: 3
		});
	});

	it('masks email addresses', () => {
		expect(maskEmail('juan@gmail.com')).toBe('j***@gmail.com');
		expect(maskEmail('  MARIA@school.edu.ph ')).toBe('m***@school.edu.ph');
	});

	it('formats resolution durations', () => {
		expect(formatDuration(null)).toBe('—');
		expect(formatDuration(10800)).toBe('3h 0m');
		expect(formatDuration(100000)).toBe('1d 3h');
		expect(formatDuration(900)).toBe('15m');
	});

	it('formats Asia/Manila timestamps and relative times', () => {
		expect(formatManilaDateTime('2026-11-24T04:30:00Z')).toContain('12:30');
		const now = new Date('2026-11-24T12:00:00Z');
		expect(formatRelativeTime('2026-11-24T11:59:30Z', now)).toBe('Just now');
		expect(formatRelativeTime('2026-11-24T11:45:00Z', now)).toBe('15m ago');
		expect(formatRelativeTime('2026-11-24T09:00:00Z', now)).toBe('3h ago');
	});
});
