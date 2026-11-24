import { expect, test } from '@playwright/test';

test('public pages render cleanly at 360px mobile viewport without overflow', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 });

	for (const path of ['/', '/privacy', '/login']) {
		const response = await page.goto(path);
		expect(response?.status(), path).toBe(200);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth
		);
		expect(overflow, `${path} horizontal overflow`).toBe(false);
	}
});

test('unauthenticated visit to /app/tickets redirects to /login with next param', async ({
	page
}) => {
	await page.goto('/app/tickets');
	await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Ftickets/);
});

test('dev styleguide is unreachable in production preview build', async ({ page }) => {
	const response = await page.goto('/dev/styleguide');
	expect(response?.status()).toBe(404);
});
