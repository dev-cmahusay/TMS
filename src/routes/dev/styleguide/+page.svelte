<script lang="ts">
	import PublicShell from '$lib/components/layout/PublicShell.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { TICKET_PRIORITIES, TICKET_STATUSES } from '$lib/ui/status';

	let sampleText = $state('');
	let sampleNote = $state('');
	let sampleSelect = $state('hardware');
	let modalOpen = $state(false);
</script>

<PublicShell title="UI Styleguide (Dev)">
	<PageHeader title="Swiss Ops Primitives" subtitle="Dev-only component showcase." />

	<div class="space-y-6">
		<Card>
			<h2 class="mb-3 text-lg font-semibold">Buttons</h2>
			<div class="flex flex-wrap gap-2">
				<Button variant="primary">Primary</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="danger">Danger</Button>
				<Button variant="primary" loading>Loading</Button>
				<Button variant="secondary" onclick={() => (modalOpen = true)}>Open modal</Button>
			</div>
		</Card>

		<Card>
			<h2 class="mb-3 text-lg font-semibold">Badges</h2>
			<div class="flex flex-wrap gap-2">
				{#each TICKET_STATUSES as status}
					<Badge {status} />
				{/each}
			</div>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each TICKET_PRIORITIES as priority}
					<Badge {priority} />
				{/each}
			</div>
		</Card>

		<Card>
			<h2 class="mb-3 text-lg font-semibold">Form controls</h2>
			<div class="space-y-4">
				<Field id="sg-name" label="Your name" required hint="Enter full name.">
					{#snippet children(describedBy)}
						<Input
							id="sg-name"
							name="name"
							bind:value={sampleText}
							aria-describedby={describedBy}
							placeholder="Juan Dela Cruz"
						/>
					{/snippet}
				</Field>

				<Field id="sg-err" label="Email" required error="Enter a valid email address.">
					{#snippet children(describedBy)}
						<Input
							id="sg-err"
							name="email"
							type="email"
							invalid
							aria-describedby={describedBy}
						/>
					{/snippet}
				</Field>

				<Field id="sg-cat" label="Category">
					{#snippet children(describedBy)}
						<Select id="sg-cat" name="category" bind:value={sampleSelect} aria-describedby={describedBy}>
							<option value="hardware">Computer / Laptop</option>
							<option value="network">Internet / Wi-Fi</option>
						</Select>
					{/snippet}
				</Field>

				<Field id="sg-desc" label="Description">
					{#snippet children(describedBy)}
						<Textarea
							id="sg-desc"
							name="description"
							bind:value={sampleNote}
							maxlength={5000}
							showCount
							aria-describedby={describedBy}
						/>
					{/snippet}
				</Field>
			</div>
		</Card>

		<Card>
			<h2 class="mb-3 text-lg font-semibold">Alerts</h2>
			<div class="space-y-3">
				<Alert variant="info">Informational notice.</Alert>
				<Alert variant="success">Request received.</Alert>
				<Alert variant="warning">This ticket was changed by someone else.</Alert>
				<Alert variant="danger">We couldn't verify you're human.</Alert>
			</div>
		</Card>

		<Card padding="none">
			<Table caption="Sample tickets">
				{#snippet head()}
					<tr>
						<th scope="col" class="px-4 py-3">Ref</th>
						<th scope="col" class="px-4 py-3">Status</th>
						<th scope="col" class="px-4 py-3">Priority</th>
					</tr>
				{/snippet}
				{#snippet body()}
					<tr>
						<td class="px-4 py-3 font-mono tabular-nums">TK-000001</td>
						<td class="px-4 py-3"><Badge status="in_progress" /></td>
						<td class="px-4 py-3"><Badge priority="high" /></td>
					</tr>
				{/snippet}
			</Table>
		</Card>
	</div>

	<Modal bind:open={modalOpen} title="Sample dialog">
		<p>Press Escape or click outside to close.</p>
		{#snippet footer()}
			<Button variant="secondary" onclick={() => (modalOpen = false)}>Close</Button>
		{/snippet}
	</Modal>
</PublicShell>
