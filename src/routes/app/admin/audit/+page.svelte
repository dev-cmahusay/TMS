<script lang="ts">
	import { getAuditActionMeta } from '$lib/audit/format';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { formatManilaDateTime } from '$lib/utils/format-date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Audit log — IT Help Desk</title>
</svelte:head>

<PageHeader
	title="Audit log"
	subtitle="Read-only record of ticket assignments, status changes, and staff administration."
/>

<div class="space-y-6">
	<Card>
		<form method="GET" class="flex flex-col gap-3 sm:flex-row sm:items-end">
			<div class="sm:w-52">
				<label for="audit-filter" class="mb-1 block text-xs font-medium text-muted">
					Event type
				</label>
				<Select id="audit-filter" name="filter" value={data.filter}>
					<option value="all">All events</option>
					<option value="assignments">Assignments</option>
					<option value="tickets">All ticket changes</option>
					<option value="team">Team changes</option>
					<option value="categories">Category changes</option>
				</Select>
			</div>

			<div class="flex-1">
				<label for="audit-search" class="mb-1 block text-xs font-medium text-muted">Search</label>
				<Input
					id="audit-search"
					name="q"
					value={data.q}
					maxlength={100}
					placeholder="Ticket ref (e.g., TK-000001) or staff name"
				/>
			</div>

			<div class="flex gap-2">
				<Button type="submit" variant="primary">Apply</Button>
				{#if data.filter !== 'all' || data.q}
					<Button href="/app/admin/audit" variant="ghost">Clear</Button>
				{/if}
			</div>
		</form>
	</Card>

	<Card padding="none">
		{#if data.logs.length === 0}
			<p class="p-6 text-sm text-muted">No audit events recorded yet.</p>
		{:else}
			<Table caption="Audit log entries">
				{#snippet head()}
					<tr>
						<th scope="col" class="px-4 py-3 font-medium">Time (PHT)</th>
						<th scope="col" class="px-4 py-3 font-medium">Actor</th>
						<th scope="col" class="px-4 py-3 font-medium">Event</th>
						<th scope="col" class="px-4 py-3 font-medium">Target</th>
						<th scope="col" class="px-4 py-3 font-medium">Details</th>
					</tr>
				{/snippet}
				{#snippet body()}
					{#each data.logs as entry}
						{@const meta = getAuditActionMeta(entry.action)}
						<tr class="hover:bg-surface-subtle">
							<td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted tabular-nums">
								<time datetime={entry.created_at}>{formatManilaDateTime(entry.created_at)}</time>
							</td>
							<td class="whitespace-nowrap px-4 py-3 font-medium text-text">
								{entry.actor_name}
							</td>
							<td class="whitespace-nowrap px-4 py-3">
								<Badge variant={meta.variant}>{meta.label}</Badge>
							</td>
							<td class="whitespace-nowrap px-4 py-3">
								{#if entry.entity_type === 'ticket'}
									<a
										href="/app/tickets/{entry.entity_label}"
										class="font-mono text-xs font-semibold text-primary hover:underline"
									>
										{entry.entity_label}
									</a>
								{:else}
									<span class="text-xs text-muted">{entry.entity_label}</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-sm text-text">{entry.summary}</td>
						</tr>
					{/each}
				{/snippet}
			</Table>
		{/if}
	</Card>
</div>
