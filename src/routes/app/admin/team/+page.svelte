<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Team — IT Help Desk</title>
</svelte:head>

<PageHeader title="Team" subtitle="Manage staff names, roles, and access." />

<div class="space-y-6">
	<Alert variant="info">
		To add a new staff member or reset a password, go to your Supabase dashboard → Authentication →
		Users → Add user. New accounts appear here automatically as agents.
	</Alert>

	{#if form && 'teamError' in form && form.teamError}
		<Alert variant="danger">{form.teamError}</Alert>
	{:else if form && 'saved' in form && form.saved}
		<Alert variant="success">Staff member updated.</Alert>
	{/if}

	<div class="space-y-3">
		{#each data.members as member}
			{@const isSelf = member.id === data.currentUserId}
			<Card>
				<form method="POST" action="?/update" class="space-y-4" use:enhance>
					<input type="hidden" name="id" value={member.id} />
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p class="text-sm font-semibold text-text">
								{member.full_name}
								{#if isSelf}
									<span class="text-xs font-normal text-muted">(you)</span>
								{/if}
							</p>
							{#if member.email}
								<p class="text-xs text-muted">{member.email}</p>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<Badge variant={member.role === 'admin' ? 'info' : 'neutral'}>
								{member.role === 'admin' ? 'Admin' : 'Agent'}
							</Badge>
							<Badge variant={member.is_active ? 'success' : 'danger'}>
								{member.is_active ? 'Active' : 'Disabled'}
							</Badge>
						</div>
					</div>

					<div class="grid gap-3 sm:grid-cols-3">
						<Field id="name-{member.id}" label="Full name" required>
							{#snippet children(describedBy)}
								<Input
									id="name-{member.id}"
									name="full_name"
									required
									maxlength={100}
									value={member.full_name}
									aria-describedby={describedBy}
								/>
							{/snippet}
						</Field>

						<Field id="role-{member.id}" label="Role">
							{#snippet children(describedBy)}
								<Select
									id="role-{member.id}"
									name="role"
									disabled={isSelf}
									value={member.role}
									aria-describedby={describedBy}
								>
									<option value="agent">Agent</option>
									<option value="admin">Admin</option>
								</Select>
							{/snippet}
						</Field>

						<Field id="active-{member.id}" label="Access">
							{#snippet children(describedBy)}
								<Select
									id="active-{member.id}"
									name="is_active"
									disabled={isSelf}
									value={member.is_active ? 'true' : 'false'}
									aria-describedby={describedBy}
								>
									<option value="true">Active</option>
									<option value="false">Disabled</option>
								</Select>
							{/snippet}
						</Field>
					</div>

					{#if isSelf}
						<input type="hidden" name="role" value={member.role} />
						<input type="hidden" name="is_active" value={member.is_active ? 'true' : 'false'} />
						<p class="text-xs text-muted">
							You can't change your own role or deactivate your own account.
						</p>
					{/if}

					<div class="flex justify-end">
						<Button type="submit" size="sm" variant="primary">Save</Button>
					</div>
				</form>
			</Card>
		{/each}
	</div>
</div>
