<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	let {
		id,
		name,
		value = $bindable(''),
		required = false,
		invalid = false,
		disabled = false,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedby,
		class: className = '',
		onchange,
		children
	}: {
		id?: string;
		name?: string;
		value?: string | number;
		required?: boolean;
		invalid?: boolean;
		disabled?: boolean;
		'aria-label'?: string;
		'aria-describedby'?: string;
		class?: string;
		onchange?: HTMLSelectAttributes['onchange'];
		children: Snippet;
	} = $props();
</script>

<select
	{id}
	{name}
	bind:value
	{required}
	{disabled}
	aria-label={ariaLabel}
	aria-invalid={invalid || undefined}
	aria-describedby={ariaDescribedby}
	{onchange}
	class="w-full min-h-11 rounded-md border bg-surface px-3 py-2 text-base text-text transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 motion-reduce:transition-none {invalid
		? 'border-danger'
		: 'border-border-strong'} {className}"
>
	{@render children()}
</select>
