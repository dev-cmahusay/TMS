<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let {
		id,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder,
		autocomplete,
		required = false,
		invalid = false,
		disabled = false,
		maxlength,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedby,
		class: className = '',
		oninput,
		onchange
	}: {
		id?: string;
		name?: string;
		type?: HTMLInputAttributes['type'];
		value?: string;
		placeholder?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		required?: boolean;
		invalid?: boolean;
		disabled?: boolean;
		maxlength?: number;
		'aria-label'?: string;
		'aria-describedby'?: string;
		class?: string;
		oninput?: HTMLInputAttributes['oninput'];
		onchange?: HTMLInputAttributes['onchange'];
	} = $props();
</script>

<input
	{id}
	{name}
	{type}
	bind:value
	{placeholder}
	{autocomplete}
	{required}
	{disabled}
	{maxlength}
	aria-label={ariaLabel}
	aria-invalid={invalid || undefined}
	aria-describedby={ariaDescribedby}
	{oninput}
	{onchange}
	class="w-full min-h-11 rounded-md border bg-surface px-3 py-2 text-base text-text placeholder:text-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-60 motion-reduce:transition-none {invalid
		? 'border-danger'
		: 'border-border-strong'} {className}"
/>
