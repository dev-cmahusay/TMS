import { expect, test } from '@playwright/test';

/**
 * Definition-of-Done E2E smoke test:
 * Submit ticket -> Agent signs in and sees it -> Agent replies.
 *
 * Requires a running Supabase instance (local or dev project) with Turnstile test keys,
 * EMAIL_MODE=log, and E2E_AGENT_EMAIL / E2E_AGENT_PASSWORD set.
 */
const ready = process.env.E2E_SUPABASE_READY === '1';

test.describe('full ticket lifecycle smoke flow', () => {
	test.skip(!ready, 'Set E2E_SUPABASE_READY=1 with Supabase credentials to run full E2E flow.');

	test('submit ticket -> agent sees it -> agent replies', async ({ page }) => {
		const agentEmail = process.env.E2E_AGENT_EMAIL ?? '';
		const agentPassword = process.env.E2E_AGENT_PASSWORD ?? '';
		const uniqueProblem = `Projector HDMI failure in Room 204 (${Date.now()})`;

		// 1. Customer submits a ticket
		await page.goto('/');
		await page.getByLabel(/Your name/i).fill('Maria Santos');
		await page.getByLabel(/Email address/i).fill('maria.santos@school.edu.ph');
		await page.getByLabel(/Category/i).selectOption({ index: 1 });
		await page.getByLabel(/Describe the problem/i).fill(uniqueProblem);
		await page.getByRole('checkbox').check();
		await page.getByRole('button', { name: 'Submit request' }).click();

		const refText = await page.locator('text=/TK-\\d{6}/').first().textContent();
		expect(refText).toMatch(/^TK-\d{6}$/);
		const ref = refText!.trim();

		// 2. Agent signs in and opens the ticket
		await page.goto('/login');
		await page.getByLabel(/^Email/i).fill(agentEmail);
		await page.getByLabel(/^Password/i).fill(agentPassword);
		await page.getByRole('button', { name: 'Sign in' }).click();
		await expect(page).toHaveURL(/\/app/);

		await page.goto(`/app/tickets/${ref}`);
		await expect(page.getByText(uniqueProblem)).toBeVisible();

		// 3. Agent adds an internal note, then sends a customer reply
		await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
		await page.getByRole('radio', { name: 'Reply to customer' }).click();
		await expect(page.getByRole('button', { name: 'Send reply' })).toBeVisible();
		await page.getByLabel('Reply to customer').fill('We replaced the HDMI cable in Room 204.');
		await page.getByRole('button', { name: 'Send reply' }).click();

		await expect(page.getByText('We replaced the HDMI cable in Room 204.')).toBeVisible();
		await expect(page.getByText('Email sent')).toBeVisible();
	});
});
