<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		caption,
		class: className = '',
		head,
		body
	}: {
		caption?: string;
		class?: string;
		head: Snippet;
		body: Snippet;
	} = $props();
</script>

<div class="w-full overflow-x-auto {className}">
	<table class="w-full border-collapse text-left text-sm">
		{#if caption}
			<caption class="sr-only">{caption}</caption>
		{/if}
		<thead class="border-b border-border bg-surface-subtle text-xs font-medium uppercase tracking-wide text-muted">
			{@render head()}
		</thead>
		<tbody class="divide-y divide-border bg-surface">
			{@render body()}
		</tbody>
	</table>
</div>
