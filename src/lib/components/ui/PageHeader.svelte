<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		title,
		subtitle,
		monoTitle = false,
		backHref,
		backLabel = 'Back',
		actions,
		meta
	}: {
		title: string;
		subtitle?: string;
		monoTitle?: boolean;
		backHref?: string;
		backLabel?: string;
		actions?: Snippet;
		meta?: Snippet;
	} = $props();
</script>

<header class="mb-6 space-y-2">
	{#if backHref}
		<a
			href={backHref}
			class="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
		>
			<Icon name="arrow-left" size="xs" />
			{backLabel}
		</a>
	{/if}
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="min-w-0 space-y-1">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-2xl font-bold text-text {monoTitle ? 'font-mono tabular-nums' : ''}">
					{title}
				</h1>
				{#if meta}
					{@render meta()}
				{/if}
			</div>
			{#if subtitle}
				<p class="text-sm text-muted">{subtitle}</p>
			{/if}
		</div>
		{#if actions}
			<div class="flex shrink-0 flex-wrap items-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>
