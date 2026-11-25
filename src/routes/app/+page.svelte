<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import { formatDuration } from '$lib/utils/format-duration';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const stats = $derived(data.stats);

	const breakdownItems = $derived([
		{ key: 'new' as const, count: stats.by_status.new },
		{ key: 'assigned' as const, count: stats.by_status.assigned },
		{ key: 'in_progress' as const, count: stats.by_status.in_progress },
		{ key: 'waiting_on_customer' as const, count: stats.by_status.waiting_on_customer }
	]);
</script>

<svelte:head>
	<title>Dashboard — IT Help Desk</title>
</svelte:head>

<PageHeader title="Dashboard" subtitle="Overview of open support tickets and recent resolution times.">
	{#snippet actions()}
		<Button href="/app/tickets" variant="primary">View tickets</Button>
	{/snippet}
</PageHeader>

<div class="space-y-6">
	<section aria-label="Summary metrics" class="grid gap-4 lg:grid-cols-3">
		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">Open tickets</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">{stats.open_total}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each breakdownItems as item}
					<a
						href="/app/tickets?status={item.key}"
						class="inline-flex items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
						<Badge status={item.key} />
						<span class="font-mono text-xs text-muted tabular-nums">{item.count}</span>
					</a>
				{/each}
			</div>
		</Card>

		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">
				Average resolution time (30 days)
			</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">
				{formatDuration(stats.avg_resolution_seconds)}
			</p>
			<p class="mt-2 text-xs text-muted">Based on tickets resolved in the last 30 days.</p>
		</Card>

		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">Resolved (30 days)</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">{stats.resolved_30d}</p>
			<p class="mt-2 text-xs text-muted">
				<a href="/app/tickets?status=resolved" class="text-primary hover:underline">
					View resolved tickets
				</a>
			</p>
		</Card>
	</section>

	<Card padding="none">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 lg:px-6">
			<h2 class="text-base font-semibold text-text">Tickets per agent</h2>
			{#if data.isAdmin}
				<Button href="/app/admin/workload" size="sm" variant="secondary">
					Manage workload
				</Button>
			{/if}
		</div>

		{#if stats.per_agent.length === 0}
			<p class="px-4 py-6 text-sm text-muted lg:px-6">No tickets recorded yet.</p>
		{:else}
			<Table caption="Tickets per agent">
				{#snippet head()}
					<tr>
						<th scope="col" class="px-4 py-3 lg:px-6">Agent</th>
						<th scope="col" class="px-4 py-3 text-right lg:px-6">Open</th>
						<th scope="col" class="px-4 py-3 text-right lg:px-6">Resolved (30d)</th>
					</tr>
				{/snippet}
				{#snippet body()}
					{#each stats.per_agent as row}
						<tr class="hover:bg-surface-subtle">
							<td class="px-4 py-3 font-medium text-text lg:px-6">
								<a
									href="/app/tickets?status=open&assignee={row.agent_id ?? 'unassigned'}"
									class="text-primary hover:underline"
								>
									{row.agent_name}
								</a>
							</td>
							<td class="px-4 py-3 text-right font-mono text-text tabular-nums lg:px-6">
								{row.open_count}
							</td>
							<td class="px-4 py-3 text-right font-mono text-muted tabular-nums lg:px-6">
								{row.resolved_30d_count}
							</td>
						</tr>
					{/each}
				{/snippet}
			</Table>
		{/if}
	</Card>
</div>
