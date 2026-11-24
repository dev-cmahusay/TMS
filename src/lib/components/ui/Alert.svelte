<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	type Variant = 'info' | 'success' | 'warning' | 'danger';

	let {
		variant = 'info',
		title,
		class: className = '',
		children
	}: {
		variant?: Variant;
		title?: string;
		class?: string;
		children: Snippet;
	} = $props();

	const styles: Record<Variant, { box: string; icon: IconName }> = {
		info: {
			box: 'border-primary/30 bg-badge-new-bg text-badge-new-fg',
			icon: 'info'
		},
		success: {
			box: 'border-success/30 bg-badge-resolved-bg text-badge-resolved-fg',
			icon: 'check'
		},
		warning: {
			box: 'border-warning/30 bg-badge-waiting-bg text-badge-waiting-fg',
			icon: 'alert'
		},
		danger: {
			box: 'border-danger/30 bg-badge-urgent-bg text-badge-urgent-fg',
			icon: 'alert'
		}
	};

	const role = $derived(variant === 'danger' || variant === 'warning' ? 'alert' : 'status');
</script>

<div
	{role}
	class="flex items-start gap-3 rounded-md border px-4 py-3 text-sm {styles[variant].box} {className}"
>
	<Icon name={styles[variant].icon} size="sm" class="mt-0.5" />
	<div class="min-w-0 flex-1 space-y-1">
		{#if title}
			<p class="font-semibold">{title}</p>
		{/if}
		<div>{@render children()}</div>
	</div>
</div>
