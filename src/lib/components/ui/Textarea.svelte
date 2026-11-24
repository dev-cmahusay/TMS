<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		id,
		name,
		value = $bindable(''),
		rows = 4,
		placeholder,
		required = false,
		invalid = false,
		disabled = false,
		maxlength,
		showCount = false,
		'aria-describedby': ariaDescribedby,
		class: className = '',
		oninput
	}: {
		id?: string;
		name?: string;
		value?: string;
		rows?: number;
		placeholder?: string;
		required?: boolean;
		invalid?: boolean;
		disabled?: boolean;
		maxlength?: number;
		showCount?: boolean;
		'aria-describedby'?: string;
		class?: string;
		oninput?: HTMLTextareaAttributes['oninput'];
	} = $props();
</script>

<div class="w-full">
	<textarea
		{id}
		{name}
		bind:value
		{rows}
		{placeholder}
		{required}
		{disabled}
		{maxlength}
		aria-invalid={invalid || undefined}
		aria-describedby={ariaDescribedby}
		{oninput}
		class="w-full rounded-md border bg-surface px-3 py-2.5 text-base text-text placeholder:text-muted resize-y transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 motion-reduce:transition-none {invalid
			? 'border-danger'
			: 'border-border-strong'} {className}"
	></textarea>
	{#if showCount && maxlength}
		<p class="mt-1 text-right font-mono text-xs text-muted tabular-nums">
			{value.length.toLocaleString()} / {maxlength.toLocaleString()}
		</p>
	{/if}
</div>
