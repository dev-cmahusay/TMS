<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		id,
		label,
		required = false,
		hint,
		error,
		class: className = '',
		children
	}: {
		id: string;
		label: string;
		required?: boolean;
		hint?: string;
		error?: string;
		class?: string;
		children: Snippet<[string | undefined]>;
	} = $props();

	const describedBy = $derived(
		[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="flex flex-col gap-1.5 {className}">
	<label for={id} class="text-sm font-medium text-text">
		{label}
		{#if required}
			<span class="text-danger" aria-hidden="true">*</span>
		{/if}
	</label>
	{@render children(describedBy)}
	{#if hint && !error}
		<p id="{id}-hint" class="text-xs text-muted">{hint}</p>
	{/if}
	{#if error}
		<p id="{id}-error" role="alert" class="text-sm text-danger">{error}</p>
	{/if}
</div>
