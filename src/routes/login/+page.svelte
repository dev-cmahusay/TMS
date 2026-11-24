<script lang="ts">
	import { enhance } from '$app/forms';
	import PublicShell from '$lib/components/layout/PublicShell.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let submitting = $state(false);

	$effect(() => {
		if (form?.email) {
			email = form.email;
		}
	});
</script>

<PublicShell title="Staff sign in — IT Help Desk" showStaffLink={false} narrow>
	<Card>
		<PageHeader title="Staff sign in" subtitle="IT Help Desk dashboard" />

		{#if form?.error}
			<Alert variant="danger" class="mb-4">{form.error}</Alert>
		{:else if data.disabledNotice}
			<Alert variant="danger" class="mb-4">
				Your account is disabled. Contact your administrator.
			</Alert>
		{/if}

		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<input type="hidden" name="next" value={data.next} />

			<Field id="login-email" label="Email" required>
				{#snippet children(describedBy)}
					<Input
						id="login-email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						aria-describedby={describedBy}
					/>
				{/snippet}
			</Field>

			<Field id="login-password" label="Password" required>
				{#snippet children(describedBy)}
					<div class="flex gap-2">
						<Input
							id="login-password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="current-password"
							required
							bind:value={password}
							aria-describedby={describedBy}
						/>
						<Button
							type="button"
							variant="secondary"
							aria-pressed={showPassword}
							onclick={() => (showPassword = !showPassword)}
						>
							{showPassword ? 'Hide' : 'Show'}
						</Button>
					</div>
				{/snippet}
			</Field>

			<Button type="submit" variant="primary" fullWidth loading={submitting}>
				{submitting ? 'Signing in…' : 'Sign in'}
			</Button>
		</form>

		<p class="mt-4 text-center text-xs text-muted">
			Forgot your password? Ask your administrator to reset it.
		</p>
	</Card>
</PublicShell>
