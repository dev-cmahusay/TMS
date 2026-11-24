<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md';

	interface BaseProps {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		disabled?: boolean;
		fullWidth?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children: Snippet;
		onclick?: HTMLButtonAttributes['onclick'];
		'aria-label'?: string;
		'aria-pressed'?: boolean | 'true' | 'false';
		title?: string;
		formaction?: string;
		name?: string;
		value?: string;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		disabled = false,
		fullWidth = false,
		href,
		type = 'button',
		class: className = '',
		children,
		onclick,
		'aria-label': ariaLabel,
		'aria-pressed': ariaPressed,
		title,
		formaction,
		name,
		value
	}: BaseProps & Partial<Pick<HTMLAnchorAttributes, 'target' | 'rel'>> = $props();

	const variantClasses: Record<Variant, string> = {
		primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
		secondary: 'bg-surface text-text border border-border-strong hover:bg-surface-subtle shadow-sm',
		ghost: 'bg-transparent text-text hover:bg-surface-subtle',
		danger: 'bg-danger text-danger-fg hover:opacity-90 shadow-sm'
	};

	const sizeClasses: Record<Size, string> = {
		sm: 'min-h-9 px-3 py-1.5 text-xs',
		md: 'min-h-11 px-4 py-2 text-sm'
	};

	const baseClasses = $derived(
		[
			'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 ease-out motion-reduce:transition-none',
			'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
			'disabled:cursor-not-allowed disabled:opacity-50',
			variantClasses[variant],
			sizeClasses[size],
			fullWidth ? 'w-full' : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href}
	<a {href} aria-label={ariaLabel} {title} class={baseClasses}>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		aria-label={ariaLabel}
		aria-pressed={ariaPressed}
		{title}
		{formaction}
		{name}
		{value}
		{onclick}
		class={baseClasses}
	>
		{#if loading}
			<span
				aria-hidden="true"
				class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
			></span>
		{/if}
		{@render children()}
	</button>
{/if}
