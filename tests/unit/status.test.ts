import { describe, expect, it } from 'vitest';
import {
	getPriorityLabel,
	getStatusLabel,
	PRIORITY_BADGE_MAP,
	STATUS_BADGE_MAP,
	TICKET_PRIORITIES,
	TICKET_STATUSES
} from '../../src/lib/ui/status';

describe('status and priority badge maps', () => {
	it('provides a non-empty label and token classes for every ticket status', () => {
		for (const status of TICKET_STATUSES) {
			expect(getStatusLabel(status).length).toBeGreaterThan(0);
			expect(STATUS_BADGE_MAP[status].classes).not.toMatch(/\[#/);
		}
	});

	it('provides a non-empty label and token classes for every ticket priority', () => {
		for (const priority of TICKET_PRIORITIES) {
			expect(getPriorityLabel(priority).length).toBeGreaterThan(0);
			expect(PRIORITY_BADGE_MAP[priority].classes).not.toMatch(/\[#/);
		}
	});
});
