<script lang="ts">
	import type { Snippet } from 'svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

	let {
		title = 'IT Help Desk',
		showStaffLink = true,
		narrow = false,
		children
	}: {
		title?: string;
		showStaffLink?: boolean;
		narrow?: boolean;
		children: Snippet;
	} = $props();
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-bg text-text">
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-fg"
	>
		Skip to content
	</a>

	<header class="border-b border-border bg-surface">
		<div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
			<a
				href="/"
				class="inline-flex min-h-11 items-center text-base font-semibold text-text hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
			>
				IT Help Desk
			</a>
			<ThemeToggle />
		</div>
	</header>

	<main
		id="main-content"
		class="mx-auto w-full flex-1 px-4 py-6 lg:py-10 {narrow ? 'max-w-md' : 'max-w-xl'}"
	>
		{@render children()}
	</main>

	<footer class="border-t border-border bg-surface py-4">
		<div class="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-4 px-4 text-xs text-muted">
			<a
				href="/privacy"
				class="inline-flex min-h-11 items-center hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
			>
				Privacy notice
			</a>
			{#if showStaffLink}
				<span aria-hidden="true">·</span>
				<a
					href="/login"
					class="inline-flex min-h-11 items-center hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
				>
					Staff sign in
				</a>
			{/if}
		</div>
	</footer>
</div>
