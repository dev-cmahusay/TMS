<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import type { TicketFilterStatus } from '$lib/tickets/filters';
	import { formatManilaDateTime, formatRelativeTime } from '$lib/utils/format-date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const tabs: Array<{ key: TicketFilterStatus; label: string }> = [
		{ key: 'open', label: 'Open' },
		{ key: 'new', label: 'New' },
		{ key: 'assigned', label: 'Assigned' },
		{ key: 'in_progress', label: 'In progress' },
		{ key: 'waiting_on_customer', label: 'Waiting on customer' },
		{ key: 'resolved', label: 'Resolved' },
		{ key: 'all', label: 'All' }
	];

	function buildHref(nextStatus: TicketFilterStatus, nextMine: boolean, nextPage = 1): string {
		const params = new URLSearchParams();
		params.set('status', nextStatus);
		if (nextMine) params.set('mine', '1');
		if (nextPage > 1) params.set('page', String(nextPage));
		return `/app/tickets?${params.toString()}`;
	}

	const startIndex = $derived(
		data.pagination.total === 0 ? 0 : (data.pagination.page - 1) * data.pagination.pageSize + 1
	);
	const endIndex = $derived(
		Math.min(data.pagination.total, data.pagination.page * data.pagination.pageSize)
	);
</script>

<svelte:head>
	<title>Tickets — IT Help Desk</title>
</svelte:head>

<PageHeader title="Tickets">
	{#snippet actions()}
		<a
			href={buildHref(data.filters.status, !data.filters.mine, 1)}
			aria-current={data.filters.mine ? 'true' : undefined}
			class="inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {data
				.filters.mine
				? 'border-primary bg-primary text-primary-fg'
				: 'border-border-strong bg-surface text-text hover:bg-surface-subtle'}"
		>
			Mine
		</a>
	{/snippet}
</PageHeader>

<div class="space-y-4">
	<nav
		aria-label="Filter tickets by status"
		class="flex gap-1 overflow-x-auto border-b border-border"
	>
		{#each tabs as tab}
			{@const active = data.filters.status === tab.key}
			<a
				href={buildHref(tab.key, data.filters.mine, 1)}
				aria-current={active ? 'page' : undefined}
				class="inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {active
					? 'border-primary text-primary'
					: 'border-transparent text-muted hover:text-text'}"
			>
				<span>{tab.label}</span>
				<span class="font-mono text-xs tabular-nums">({data.counts[tab.key]})</span>
			</a>
		{/each}
	</nav>

	{#if data.tickets.length === 0}
		<Card class="text-center">
			<p class="text-sm text-muted">No tickets here yet.</p>
			{#if data.filters.mine || data.filters.status !== 'open'}
				<div class="mt-3">
					<Button href="/app/tickets" variant="secondary" size="sm">Show all open tickets</Button>
				</div>
			{/if}
		</Card>
	{:else}
		<!-- Mobile card list (< lg) -->
		<div class="space-y-3 lg:hidden">
			{#each data.tickets as ticket}
				<a
					href="/app/tickets/{ticket.ref}"
					class="block rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors duration-150 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<span class="font-mono text-sm font-semibold text-primary tabular-nums">
							{ticket.ref}
						</span>
						<div class="flex flex-wrap items-center gap-1.5">
							<Badge status={ticket.status} />
							<Badge priority={ticket.priority} />
						</div>
					</div>
					<p class="mt-2 text-sm font-medium text-text">{ticket.customer_name}</p>
					<p class="text-xs text-muted">{ticket.category_name}</p>
					<div class="mt-2 flex items-center justify-between text-xs text-muted">
						<span>{ticket.assignee_name ?? 'Unassigned'}</span>
						<time datetime={ticket.created_at} title={formatManilaDateTime(ticket.created_at)}>
							{formatRelativeTime(ticket.created_at)}
						</time>
					</div>
				</a>
			{/each}
		</div>

		<!-- Desktop semantic table (>= lg) -->
		<Card padding="none" class="hidden lg:block">
			<Table caption="Support tickets">
				{#snippet head()}
					<tr>
						<th scope="col" class="px-4 py-3">Ref</th>
						<th scope="col" class="px-4 py-3">Customer</th>
						<th scope="col" class="px-4 py-3">Category</th>
						<th scope="col" class="px-4 py-3">Status</th>
						<th scope="col" class="px-4 py-3">Priority</th>
						<th scope="col" class="px-4 py-3">Assignee</th>
						<th scope="col" class="px-4 py-3 text-right">Created</th>
					</tr>
				{/snippet}
				{#snippet body()}
					{#each data.tickets as ticket}
						<tr class="hover:bg-surface-subtle">
							<td class="px-4 py-3 font-mono font-semibold tabular-nums">
								<a
									href="/app/tickets/{ticket.ref}"
									class="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
								>
									{ticket.ref}
								</a>
							</td>
							<td class="px-4 py-3 font-medium text-text">{ticket.customer_name}</td>
							<td class="px-4 py-3 text-muted">{ticket.category_name}</td>
							<td class="px-4 py-3"><Badge status={ticket.status} /></td>
							<td class="px-4 py-3"><Badge priority={ticket.priority} /></td>
							<td class="px-4 py-3 text-muted">{ticket.assignee_name ?? 'Unassigned'}</td>
							<td class="px-4 py-3 text-right text-xs text-muted whitespace-nowrap">
								<time datetime={ticket.created_at} title={formatManilaDateTime(ticket.created_at)}>
									{formatRelativeTime(ticket.created_at)}
								</time>
							</td>
						</tr>
					{/each}
				{/snippet}
			</Table>
		</Card>

		{#if data.pagination.totalPages > 1}
			<div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
				<p class="text-xs text-muted tabular-nums">
					Showing {startIndex}–{endIndex} of {data.pagination.total}
				</p>
				<div class="flex gap-2">
					{#if data.pagination.page > 1}
						<Button
							href={buildHref(data.filters.status, data.filters.mine, data.pagination.page - 1)}
							variant="secondary"
							size="sm"
						>
							Previous
						</Button>
					{/if}
					{#if data.pagination.page < data.pagination.totalPages}
						<Button
							href={buildHref(data.filters.status, data.filters.mine, data.pagination.page + 1)}
							variant="secondary"
							size="sm"
						>
							Next
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
