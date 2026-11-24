<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let newName = $state('');
	let editingId = $state<number | null>(null);
	let editName = $state('');

	$effect(() => {
		if (form && 'created' in form && form.created) {
			newName = '';
		}
		if (form && 'renamed' in form && form.renamed) {
			editingId = null;
			editName = '';
		}
	});

	function startEdit(id: number, currentName: string) {
		editingId = id;
		editName = currentName;
	}
</script>

<svelte:head>
	<title>Categories — IT Help Desk</title>
</svelte:head>

<PageHeader
	title="Categories"
	subtitle="Categories shown on the public request form. Deactivating hides a category without affecting past tickets."
/>

<div class="space-y-6">
	<Card>
		{#if form && 'createError' in form && form.createError}
			<Alert variant="danger" class="mb-4">{form.createError}</Alert>
		{/if}
		<form
			method="POST"
			action="?/create"
			class="flex flex-col gap-3 sm:flex-row sm:items-end"
			use:enhance
		>
			<div class="flex-1">
				<Field id="new-category-name" label="Add category" required>
					{#snippet children(describedBy)}
						<Input
							id="new-category-name"
							name="name"
							required
							maxlength={50}
							bind:value={newName}
							aria-describedby={describedBy}
							placeholder="e.g., Smart Board / Audio"
						/>
					{/snippet}
				</Field>
			</div>
			<Button type="submit" variant="primary">Add category</Button>
		</form>
	</Card>

	{#if form && 'actionError' in form && form.actionError}
		<Alert variant="danger">{form.actionError}</Alert>
	{/if}

	<Card padding="none">
		{#if data.categories.length === 0}
			<p class="p-6 text-sm text-muted">No categories yet.</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each data.categories as cat, index}
					<li class="flex flex-wrap items-center justify-between gap-3 p-4">
						{#if editingId === cat.id}
							<form
								method="POST"
								action="?/rename"
								class="flex flex-1 flex-wrap items-center gap-2"
								use:enhance
							>
								<input type="hidden" name="id" value={cat.id} />
								<div class="min-w-48 flex-1">
									<Input
										name="name"
										required
										maxlength={50}
										bind:value={editName}
										aria-label="Category name"
									/>
								</div>
								<Button type="submit" size="sm" variant="primary">Save</Button>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onclick={() => (editingId = null)}
								>
									Cancel
								</Button>
							</form>
						{:else}
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-medium text-text">{cat.name}</span>
								<Badge variant={cat.is_active ? 'success' : 'neutral'}>
									{cat.is_active ? 'Active' : 'Inactive'}
								</Badge>
							</div>

							<div class="flex flex-wrap items-center gap-1.5">
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onclick={() => startEdit(cat.id, cat.name)}
								>
									Rename
								</Button>

								<form method="POST" action="?/move" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="direction" value="up" />
									<button
										type="submit"
										disabled={index === 0}
										aria-label="Move {cat.name} up"
										class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
									>
										<Icon name="chevron-up" size="sm" />
									</button>
								</form>

								<form method="POST" action="?/move" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="direction" value="down" />
									<button
										type="submit"
										disabled={index === data.categories.length - 1}
										aria-label="Move {cat.name} down"
										class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
									>
										<Icon name="chevron-down" size="sm" />
									</button>
								</form>

								<form method="POST" action="?/toggle" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="next_active" value={cat.is_active ? 'false' : 'true'} />
									<Button type="submit" size="sm" variant="secondary">
										{cat.is_active ? 'Deactivate' : 'Activate'}
									</Button>
								</form>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</div>
