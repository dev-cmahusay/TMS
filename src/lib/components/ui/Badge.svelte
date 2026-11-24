<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		PRIORITY_BADGE_MAP,
		STATUS_BADGE_MAP,
		type TicketPriority,
		type TicketStatus
	} from '$lib/ui/status';

	type Variant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

	let {
		status,
		priority,
		variant = 'neutral',
		class: className = '',
		children
	}: {
		status?: TicketStatus;
		priority?: TicketPriority;
		variant?: Variant;
		class?: string;
		children?: Snippet;
	} = $props();

	const variantMap: Record<Variant, string> = {
		neutral: 'bg-surface-subtle text-text',
		info: 'bg-badge-new-bg text-badge-new-fg',
		success: 'bg-badge-resolved-bg text-badge-resolved-fg',
		warning: 'bg-badge-waiting-bg text-badge-waiting-fg',
		danger: 'bg-badge-urgent-bg text-badge-urgent-fg'
	};

	const resolved = $derived.by(() => {
		if (status) return STATUS_BADGE_MAP[status];
		if (priority) return PRIORITY_BADGE_MAP[priority];
		return { label: '', classes: variantMap[variant] };
	});
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap {resolved.classes} {className}"
>
	{#if children}
		{@render children()}
	{:else}
		{resolved.label}
	{/if}
</span>
