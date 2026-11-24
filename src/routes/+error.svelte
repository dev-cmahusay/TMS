<script lang="ts">
	import { page } from '$app/state';
	import PublicShell from '$lib/components/layout/PublicShell.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	const status = $derived(page.status);
	const isAppRoute = $derived(page.url.pathname.startsWith('/app'));

	const heading = $derived(
		status === 403
			? 'Access denied'
			: status === 404
				? page.error?.message || 'Page not found.'
				: 'Something went wrong'
	);

	const detail = $derived(
		status === 403
			? "You don't have access to this page."
			: status === 404
				? 'Check the web address or return to the main page.'
				: 'Something went wrong on our side. Please try again in a few minutes.'
	);
</script>

<PublicShell title="{status} — IT Help Desk" narrow>
	<Card>
		<PageHeader title={heading} />
		<Alert variant={status === 403 ? 'warning' : 'danger'}>
			{detail}
		</Alert>
		<div class="mt-5">
			<Button href={isAppRoute ? '/app' : '/'} variant="primary" fullWidth>
				{isAppRoute ? 'Back to dashboard' : 'Back to request form'}
			</Button>
		</div>
	</Card>
</PublicShell>
