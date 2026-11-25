<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { formatManilaDateTime, formatRelativeTime } from '$lib/utils/format-date';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const avgOpen = $derived(
		data.summary.activeStaffCount > 0
			? (data.summary.assignedOpenCount / data.summary.activeStaffCount).toFixed(1)
			: '0.0'
	);

	function loadBarWidth(openCount: number): string {
		if (data.summary.maxOpen === 0 || openCount === 0) return '0%';
		return `${Math.max(8, Math.round((openCount / data.summary.maxOpen) * 100))}%`;
	}
</script>

<svelte:head>
	<title>Workload — IT Help Desk</title>
</svelte:head>

<PageHeader
	title="Workload & distribution"
	subtitle="See how many and which open tickets each staff member holds so you can balance assignments fairly."
/>

<div class="space-y-6">
	{#if form && 'workloadError' in form && form.workloadError}
		<Alert variant="danger">{form.workloadError}</Alert>
	{:else if form && 'assigned' in form && form.assigned}
		<Alert variant="success">
			Assigned <span class="font-mono font-semibold">{form.assignedRef}</span> to {form.assignedTo}.
		</Alert>
	{/if}

	<!-- Summary metrics -->
	<section aria-label="Workload summary" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">Unassigned</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">
				{data.summary.unassignedCount}
			</p>
			<p class="mt-1 text-xs text-muted">Waiting to be distributed</p>
		</Card>

		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">Assigned (open)</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">
				{data.summary.assignedOpenCount}
			</p>
			<p class="mt-1 text-xs text-muted">Active tickets across staff</p>
		</Card>

		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">Active staff</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">
				{data.summary.activeStaffCount}
			</p>
			<p class="mt-1 text-xs text-muted">Available for assignment</p>
		</Card>

		<Card>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">Avg open / staff</p>
			<p class="mt-2 font-mono text-3xl font-bold text-text tabular-nums">{avgOpen}</p>
			<p class="mt-1 text-xs text-muted">Target balance baseline</p>
		</Card>
	</section>

	<!-- Unassigned queue for quick distribution -->
	<Card padding="none">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 lg:px-6">
			<div>
				<h2 class="text-base font-semibold text-text">
					Unassigned queue ({data.unassigned.length})
				</h2>
				<p class="text-xs text-muted">
					Staff are listed from fewest to most open tickets below.
				</p>
			</div>
			{#if data.unassigned.length > 0}
				<Button href="/app/tickets?status=new" size="sm" variant="ghost">View in Tickets</Button>
			{/if}
		</div>

		{#if data.unassigned.length === 0}
			<p class="px-4 py-6 text-sm text-muted lg:px-6">
				All open tickets are currently assigned.
			</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each data.unassigned as ticket}
					<li class="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
						<div class="min-w-0 space-y-1">
							<div class="flex flex-wrap items-center gap-2">
								<a
									href="/app/tickets/{ticket.ref}"
									class="font-mono text-sm font-semibold text-primary hover:underline tabular-nums"
								>
									{ticket.ref}
								</a>
								<Badge priority={ticket.priority} />
								<span class="text-xs text-muted">{ticket.category_name}</span>
							</div>
							<p class="text-sm text-text">
								{ticket.customer_name}
								<span class="mx-1.5 text-muted">·</span>
								<time
									datetime={ticket.created_at}
									title={formatManilaDateTime(ticket.created_at)}
									class="text-xs text-muted"
								>
									Submitted {formatRelativeTime(ticket.created_at)}
								</time>
							</p>
						</div>

						<form
							method="POST"
							action="?/assign"
							class="flex flex-wrap items-center gap-2 sm:flex-nowrap"
							use:enhance
						>
							<input type="hidden" name="ticket_id" value={ticket.id} />
							<input type="hidden" name="expected_updated_at" value={ticket.updated_at} />
							<div class="min-w-52 flex-1">
								<Select
									name="assignee_id"
									required
									aria-label="Assign {ticket.ref} to staff member"
								>
									<option value="">Assign to…</option>
									{#each data.staffWorkloads as staff}
										<option value={staff.id}>
											{staff.full_name} ({staff.openCount} open)
										</option>
									{/each}
								</Select>
							</div>
							<Button type="submit" size="sm" variant="primary">Assign</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<!-- Per-staff workload breakdown -->
	<section aria-label="Staff ticket assignments" class="space-y-4">
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<h2 class="text-base font-semibold text-text">Tickets by staff member</h2>
			<p class="text-xs text-muted">Sorted from least busy to busiest</p>
		</div>

		{#if data.staffWorkloads.length === 0}
			<Card>
				<p class="text-sm text-muted">No active staff accounts found.</p>
			</Card>
		{:else}
			<div class="grid gap-4 lg:grid-cols-2">
				{#each data.staffWorkloads as staff}
					<Card padding="none" class="flex flex-col">
						<div class="space-y-3 border-b border-border p-4">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<div>
									<div class="flex flex-wrap items-center gap-2">
										<h3 class="text-base font-semibold text-text">{staff.full_name}</h3>
										<Badge variant={staff.role === 'admin' ? 'info' : 'neutral'}>
											{staff.role === 'admin' ? 'Admin' : 'Agent'}
										</Badge>
									</div>
									<p class="mt-1 text-xs text-muted">
										<span class="font-mono font-semibold text-text tabular-nums">
											{staff.openCount}
										</span>
										open
										<span class="mx-1">·</span>
										<span class="font-mono tabular-nums">{staff.resolved30dCount}</span>
										resolved (30d)
									</p>
								</div>

								<a
									href="/app/tickets?status=open&assignee={staff.id}"
									class="text-xs font-medium text-primary hover:underline"
								>
									View all
								</a>
							</div>

							<!-- Proportional open load bar -->
							<div class="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
								<div
									class="h-full rounded-full bg-primary transition-all duration-150"
									style="width: {loadBarWidth(staff.openCount)}"
								></div>
							</div>

							<div class="flex flex-wrap gap-2 text-xs text-muted">
								<span>
									Assigned: <strong class="font-mono text-text tabular-nums">{staff.assignedCount}</strong>
								</span>
								<span>·</span>
								<span>
									In progress: <strong class="font-mono text-text tabular-nums">{staff.inProgressCount}</strong>
								</span>
								<span>·</span>
								<span>
									Waiting: <strong class="font-mono text-text tabular-nums">{staff.waitingCount}</strong>
								</span>
							</div>
						</div>

						{#if staff.tickets.length === 0}
							<p class="p-4 text-sm text-muted">No open tickets assigned — ready for new tickets.</p>
						{:else}
							<ul class="divide-y divide-border">
								{#each staff.tickets as ticket}
									<li class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-subtle">
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-2">
												<a
													href="/app/tickets/{ticket.ref}"
													class="font-mono text-xs font-semibold text-primary hover:underline tabular-nums"
												>
													{ticket.ref}
												</a>
												<Badge status={ticket.status} />
												<Badge priority={ticket.priority} />
											</div>
											<p class="mt-1 truncate text-xs text-muted">
												{ticket.customer_name} · {ticket.category_name}
											</p>
										</div>

										<form method="POST" action="?/assign" class="flex items-center gap-1.5" use:enhance>
											<input type="hidden" name="ticket_id" value={ticket.id} />
											<input type="hidden" name="expected_updated_at" value={ticket.updated_at} />
											<Select
												name="assignee_id"
												aria-label="Reassign {ticket.ref}"
												class="w-36 text-xs"
											>
												<option value="">Reassign…</option>
												{#each data.staffWorkloads.filter((s) => s.id !== staff.id) as other}
													<option value={other.id}>
														{other.full_name} ({other.openCount})
													</option>
												{/each}
											</Select>
											<Button type="submit" size="sm" variant="secondary">Move</Button>
										</form>
									</li>
								{/each}
							</ul>
						{/if}
					</Card>
				{/each}
			</div>
		{/if}
	</section>

	{#if data.inactiveAssigned.length > 0}
		<Card padding="none">
			<div class="border-b border-border px-4 py-3 lg:px-6">
				<h2 class="text-base font-semibold text-text">
					Assigned to inactive staff ({data.inactiveAssigned.length})
				</h2>
				<p class="text-xs text-muted">Reassign these tickets to an active staff member.</p>
			</div>
			<ul class="divide-y divide-border">
				{#each data.inactiveAssigned as ticket}
					<li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
						<div class="flex flex-wrap items-center gap-2">
							<a
								href="/app/tickets/{ticket.ref}"
								class="font-mono text-sm font-semibold text-primary hover:underline tabular-nums"
							>
								{ticket.ref}
							</a>
							<Badge status={ticket.status} />
							<span class="text-xs text-muted">{ticket.customer_name} · {ticket.category_name}</span>
						</div>
						<form method="POST" action="?/assign" class="flex items-center gap-2" use:enhance>
							<input type="hidden" name="ticket_id" value={ticket.id} />
							<input type="hidden" name="expected_updated_at" value={ticket.updated_at} />
							<Select name="assignee_id" required aria-label="Reassign {ticket.ref}">
								<option value="">Reassign to…</option>
								{#each data.staffWorkloads as staff}
									<option value={staff.id}>{staff.full_name} ({staff.openCount} open)</option>
								{/each}
							</Select>
							<Button type="submit" size="sm" variant="primary">Reassign</Button>
						</form>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</div>
