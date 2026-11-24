<script lang="ts">
	import type { Snippet } from 'svelte';

	type Padding = 'none' | 'sm' | 'md';

	let {
		padding = 'md',
		subtle = false,
		dashed = false,
		as = 'div',
		class: className = '',
		children
	}: {
		padding?: Padding;
		subtle?: boolean;
		dashed?: boolean;
		as?: 'div' | 'section' | 'article';
		class?: string;
		children: Snippet;
	} = $props();

	const padClass = $derived(
		padding === 'none' ? '' : padding === 'sm' ? 'p-3 lg:p-4' : 'p-4 lg:p-6'
	);
</script>

<svelte:element
	this={as}
	class="rounded-lg border shadow-sm {subtle ? 'bg-surface-subtle' : 'bg-surface'} {dashed
		? 'border-dashed border-border-strong'
		: 'border-border'} {padClass} {className}"
>
	{@render children()}
</svelte:element>
