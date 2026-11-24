<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { allowedStatusOptions } from '$lib/tickets/transitions';
	import {
		getPriorityLabel,
		getStatusLabel,
		TICKET_PRIORITIES,
		type TicketPriority,
		type TicketStatus
	} from '$lib/ui/status';
	import { formatManilaDateTime } from '$lib/utils/format-date';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedStatus = $state<TicketStatus>('new');
	let selectedPriority = $state<TicketPriority>('normal');
	let selectedAssignee = $state('');
	let waitingReply = $state('');
	let resolutionNote = $state('');
	let savingMeta = $state(false);
	let reopening = $state(false);

	// Composer always defaults to internal note on page load (UC-08 AC-08.3)
	let composerMode = $state<'note' | 'reply'>('note');
	let composerBody = $state('');
	let submittingComposer = $state(false);

	$effect(() => {
		selectedStatus = data.ticket.status;
		selectedPriority = data.ticket.priority;
		selectedAssignee = data.ticket.assignee_id ?? '';
	});

	$effect(() => {
		if (form && 'composerMode' in form && (form.composerMode === 'note' || form.composerMode === 'reply')) {
			composerMode = form.composerMode;
		}
		if (form && (('noteAdded' in form && form.noteAdded) || ('replySent' in form && form.replySent))) {
			composerBody = '';
			composerMode = 'note';
		}
		if (form && 'updated' in form && form.updated) {
			waitingReply = '';
			resolutionNote = '';
		}
	});

	const statusOptions = $derived(allowedStatusOptions(data.ticket.status));
	const needsWaitingReply = $derived(
		selectedStatus === 'waiting_on_customer' && data.ticket.status !== 'waiting_on_customer'
	);
	const enteringResolved = $derived(
		selectedStatus === 'resolved' && data.ticket.status !== 'resolved'
	);
	const isResolved = $derived(data.ticket.status === 'resolved');
</script>

<svelte:head>
	<title>{data.ticket.ref} — IT Help Desk</title>
</svelte:head>

<PageHeader
	title={data.ticket.ref}
	monoTitle
	subtitle="{data.ticket.category_name} · Submitted {formatManilaDateTime(data.ticket.created_at)}"
	backHref="/app/tickets"
	backLabel="Back to tickets"
>
	{#snippet meta()}
		<Badge status={data.ticket.status} />
		<Badge priority={data.ticket.priority} />
	{/snippet}
</PageHeader>

{#if form && 'conflict' in form && form.conflict}
	<Alert variant="warning" class="mb-4">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span>{form.updateError}</span>
			<Button size="sm" variant="secondary" onclick={() => invalidateAll()}>Reload ticket</Button>
		</div>
	</Alert>
{:else if form && 'updateError' in form && form.updateError}
	<Alert variant="danger" class="mb-4">{form.updateError}</Alert>
{/if}

{#if isResolved}
	<Alert variant="success" class="mb-4">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<span>
				Resolved{data.ticket.resolved_at ? ` on ${formatManilaDateTime(data.ticket.resolved_at)}` : ''}.
			</span>
			<form
				method="POST"
				action="?/reopen"
				use:enhance={() => {
					reopening = true;
					return async ({ update }) => {
						await update();
						reopening = false;
					};
				}}
			>
				<input type="hidden" name="expected_updated_at" value={data.ticket.updated_at} />
				<Button type="submit" size="sm" variant="secondary" loading={reopening}>
					Reopen ticket
				</Button>
			</form>
		</div>
	</Alert>
{/if}

<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
	<!-- Main left column -->
	<div class="min-w-0 flex-1 space-y-6">
		<!-- Original request -->
		<Card as="section">
			<div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
				<div>
					<h2 class="text-base font-semibold text-text">{data.ticket.customer_name}</h2>
					<div class="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted">
						<a href="mailto:{data.ticket.customer_email}" class="text-primary hover:underline">
							{data.ticket.customer_email}
						</a>
						{#if data.ticket.customer_phone}
							<span class="font-mono tabular-nums">{data.ticket.customer_phone}</span>
						{/if}
					</div>
				</div>
			</div>

			<p class="mt-4 whitespace-pre-wrap break-words text-base leading-relaxed text-text">
				{data.ticket.description}
			</p>

			{#if data.attachments.length > 0}
				<div class="mt-5 border-t border-border pt-4">
					<p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
						Attachments ({data.attachments.length})
					</p>
					<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{#each data.attachments as att, index}
							{#if att.url}
								<a
									href={att.url}
									target="_blank"
									rel="noopener noreferrer"
									class="group overflow-hidden rounded-md border border-border bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
								>
									<img
										src={att.url}
										alt="Ticket attachment {index + 1}"
										class="aspect-video w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
									/>
									<span class="flex items-center justify-between px-2 py-1.5 text-xs text-muted">
										<span>Photo {index + 1}</span>
										<Icon name="external-link" size="xs" />
									</span>
								</a>
							{:else}
								<div
									class="flex aspect-video items-center justify-center rounded-md border border-border bg-surface-subtle p-3 text-center text-xs text-muted"
								>
									Image unavailable. Reload the page.
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</Card>

		<!-- Thread -->
		<section aria-label="Ticket activity" class="space-y-3">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-muted">Activity</h2>

			{#each data.messages as msg}
				{#if msg.author_id === null}
					<div
						class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-subtle px-4 py-2.5 text-xs text-muted"
					>
						<span>{msg.body}</span>
						<div class="flex items-center gap-2">
							{#if msg.email_status === 'sent'}
								<Badge variant="success">Email sent</Badge>
							{:else if msg.email_status === 'failed'}
								<Badge variant="danger">Email not sent</Badge>
							{/if}
							<time datetime={msg.created_at} class="font-mono tabular-nums">
								{formatManilaDateTime(msg.created_at)}
							</time>
						</div>
					</div>
				{:else if msg.is_internal}
					<article class="rounded-lg border border-dashed border-border-strong bg-note-bg p-4">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant="neutral">
									<Icon name="lock" size="xs" />
									Internal note — not sent to customer
								</Badge>
								<span class="text-xs font-medium text-text">{msg.author_name ?? 'Staff'}</span>
							</div>
							<time datetime={msg.created_at} class="font-mono text-xs text-muted tabular-nums">
								{formatManilaDateTime(msg.created_at)}
							</time>
						</div>
						<p class="mt-3 whitespace-pre-wrap break-words text-sm text-text">{msg.body}</p>
					</article>
				{:else}
					<article class="rounded-lg border border-border bg-surface p-4 shadow-sm">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant="info">
									<Icon name="mail" size="xs" />
									Sent to customer
								</Badge>
								<span class="text-xs font-medium text-text">{msg.author_name ?? 'Staff'}</span>
								{#if msg.email_status === 'sent'}
									<span class="text-xs text-muted">Email sent</span>
								{:else if msg.email_status === 'failed'}
									<Badge variant="danger">Email not sent</Badge>
								{/if}
							</div>
							<time datetime={msg.created_at} class="font-mono text-xs text-muted tabular-nums">
								{formatManilaDateTime(msg.created_at)}
							</time>
						</div>
						<p class="mt-3 whitespace-pre-wrap break-words text-sm text-text">{msg.body}</p>
						{#if msg.email_status === 'failed'}
							<p class="mt-2 text-xs text-danger">
								Copy the reply and email the customer directly.
							</p>
						{/if}
					</article>
				{/if}
			{/each}
		</section>

		<!-- Composer (defaults to Internal note) -->
		<section
			aria-label="Add note or reply"
			class="rounded-lg border p-4 shadow-sm lg:p-5 {composerMode === 'note'
				? 'border-dashed border-border-strong bg-note-bg'
				: 'border-primary bg-surface'}"
		>
			<div class="mb-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Message type">
				<button
					type="button"
					role="radio"
					aria-checked={composerMode === 'note'}
					onclick={() => (composerMode = 'note')}
					class="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {composerMode ===
					'note'
						? 'border-border-strong bg-surface text-text shadow-sm'
						: 'border-transparent text-muted hover:text-text'}"
				>
					<Icon name="lock" size="xs" />
					Internal note
				</button>
				<button
					type="button"
					role="radio"
					aria-checked={composerMode === 'reply'}
					onclick={() => (composerMode = 'reply')}
					class="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {composerMode ===
					'reply'
						? 'border-primary bg-primary text-primary-fg shadow-sm'
						: 'border-transparent text-muted hover:text-text'}"
				>
					<Icon name="mail" size="xs" />
					Reply to customer
				</button>
			</div>

			<p class="mb-3 text-xs text-muted">
				{#if composerMode === 'note'}
					Visible to staff only. No email is sent.
				{:else}
					Sends an email to {data.ticket.customer_email}.
				{/if}
			</p>

			{#if form && 'composerError' in form && form.composerError}
				<Alert variant="danger" class="mb-3">{form.composerError}</Alert>
			{/if}

			<form
				method="POST"
				action={composerMode === 'note' ? '?/note' : '?/reply'}
				class="space-y-3"
				use:enhance={() => {
					submittingComposer = true;
					return async ({ update }) => {
						await update();
						submittingComposer = false;
					};
				}}
			>
				<Field
					id="composer-body"
					label={composerMode === 'note' ? 'Internal note' : 'Reply to customer'}
					required
				>
					{#snippet children(describedBy)}
						<Textarea
							id="composer-body"
							name="body"
							rows={4}
							maxlength={5000}
							showCount
							required
							bind:value={composerBody}
							aria-describedby={describedBy}
							placeholder={composerMode === 'note'
								? 'Add troubleshooting details or handover notes for staff…'
								: 'Write an update to email to the customer…'}
						/>
					{/snippet}
				</Field>

				<div class="flex justify-end">
					<Button
						type="submit"
						variant={composerMode === 'note' ? 'secondary' : 'primary'}
						loading={submittingComposer}
					>
						{composerMode === 'note' ? 'Add note' : 'Send reply'}
					</Button>
				</div>
			</form>
		</section>
	</div>

	<!-- Right metadata sidebar -->
	<aside class="w-full lg:w-80 lg:shrink-0">
		<Card>
			<h2 class="mb-4 text-base font-semibold text-text">Ticket details</h2>

			<form
				method="POST"
				action="?/update"
				class="space-y-4"
				use:enhance={() => {
					savingMeta = true;
					return async ({ update }) => {
						await update();
						savingMeta = false;
					};
				}}
			>
				<input type="hidden" name="expected_updated_at" value={data.ticket.updated_at} />

				<Field
					id="ticket-assignee"
					label="Assignee"
					hint={isResolved ? 'Reopen the ticket to change the assignee.' : undefined}
				>
					{#snippet children(describedBy)}
						<Select
							id="ticket-assignee"
							name="assignee_id"
							disabled={isResolved}
							bind:value={selectedAssignee}
							aria-describedby={describedBy}
						>
							<option value="">Unassigned</option>
							{#if data.ticket.assignee_inactive && data.ticket.assignee_id && data.ticket.assignee_name}
								<option value={data.ticket.assignee_id}>
									{data.ticket.assignee_name} (inactive)
								</option>
							{/if}
							{#each data.activeStaff as staff}
								<option value={staff.id}>{staff.full_name}</option>
							{/each}
						</Select>
					{/snippet}
				</Field>
				{#if isResolved && data.ticket.assignee_id}
					<input type="hidden" name="assignee_id" value={data.ticket.assignee_id} />
				{/if}

				<Field id="ticket-status" label="Status">
					{#snippet children(describedBy)}
						<Select
							id="ticket-status"
							name="status"
							bind:value={selectedStatus}
							aria-describedby={describedBy}
						>
							{#each statusOptions as status}
								<option value={status}>{getStatusLabel(status)}</option>
							{/each}
						</Select>
					{/snippet}
				</Field>

				{#if needsWaitingReply}
					<Field
						id="waiting-reply"
						label="Reply to customer"
						required
						hint="Tell the customer what you need — this will be emailed."
					>
						{#snippet children(describedBy)}
							<Textarea
								id="waiting-reply"
								name="reply_body"
								rows={3}
								maxlength={5000}
								required
								bind:value={waitingReply}
								aria-describedby={describedBy}
							/>
						{/snippet}
					</Field>
				{/if}

				{#if enteringResolved}
					<Field
						id="resolution-note"
						label="Resolution note to customer (optional)"
						hint="Leave blank to send the default resolution email."
					>
						{#snippet children(describedBy)}
							<Textarea
								id="resolution-note"
								name="resolution_note"
								rows={3}
								maxlength={5000}
								bind:value={resolutionNote}
								aria-describedby={describedBy}
								placeholder="Your request has been marked as resolved. If the problem continues, reply to this email."
							/>
						{/snippet}
					</Field>
				{/if}

				<Field id="ticket-priority" label="Priority">
					{#snippet children(describedBy)}
						<Select
							id="ticket-priority"
							name="priority"
							bind:value={selectedPriority}
							aria-describedby={describedBy}
						>
							{#each TICKET_PRIORITIES as p}
								<option value={p}>{getPriorityLabel(p)}</option>
							{/each}
						</Select>
					{/snippet}
				</Field>

				<Button type="submit" variant="primary" fullWidth loading={savingMeta}>
					{savingMeta ? 'Saving…' : 'Save'}
				</Button>
			</form>

			<dl class="mt-5 space-y-2 border-t border-border pt-4 text-xs">
				<div class="flex justify-between gap-2">
					<dt class="text-muted">Created</dt>
					<dd class="font-mono text-text tabular-nums">
						{formatManilaDateTime(data.ticket.created_at)}
					</dd>
				</div>
				<div class="flex justify-between gap-2">
					<dt class="text-muted">Updated</dt>
					<dd class="font-mono text-text tabular-nums">
						{formatManilaDateTime(data.ticket.updated_at)}
					</dd>
				</div>
			</dl>
		</Card>
	</aside>
</div>
