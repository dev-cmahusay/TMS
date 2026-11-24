<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import type { UserRole } from '$lib/ui/status';

	export interface StaffProfile {
		id: string;
		full_name: string;
		role: UserRole;
	}

	let {
		profile,
		children
	}: {
		profile: StaffProfile;
		children: Snippet;
	} = $props();

	const pathname = $derived(page.url.pathname);

	interface NavItem {
		href: string;
		label: string;
		exact?: boolean;
	}

	const primaryNav: NavItem[] = [
		{ href: '/app', label: 'Dashboard', exact: true },
		{ href: '/app/tickets', label: 'Tickets' }
	];

	const adminNav: NavItem[] = [
		{ href: '/app/admin/categories', label: 'Categories' },
		{ href: '/app/admin/team', label: 'Team' },
		{ href: '/app/admin/audit', label: 'Audit log' }
	];

	function isActive(item: NavItem): boolean {
		if (item.exact) return pathname === item.href;
		return pathname === item.href || pathname.startsWith(`${item.href}/`);
	}
</script>

<div class="min-h-screen bg-bg text-text lg:flex">
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-fg"
	>
		Skip to content
	</a>

	<!-- Mobile top header + single-row nav strip (< lg) -->
	<div class="border-b border-border bg-surface lg:hidden">
		<div class="flex h-14 items-center justify-between px-4">
			<a
				href="/app"
				class="inline-flex min-h-11 items-center text-base font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
			>
				IT Help Desk
			</a>
			<div class="flex items-center gap-2">
				<ThemeToggle />
				<form method="POST" action="/logout">
					<button
						type="submit"
						aria-label="Sign out"
						title="Sign out"
						class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
						<Icon name="logout" size="sm" />
					</button>
				</form>
			</div>
		</div>
		<nav aria-label="Main navigation" class="flex gap-1 overflow-x-auto border-t border-border px-2">
			{#each primaryNav as item}
				<a
					href={item.href}
					aria-current={isActive(item) ? 'page' : undefined}
					class="inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {isActive(item)
						? 'border-primary text-primary'
						: 'border-transparent text-muted hover:text-text'}"
				>
					{item.label}
				</a>
			{/each}
			{#if profile.role === 'admin'}
				{#each adminNav as item}
					<a
						href={item.href}
						aria-current={isActive(item) ? 'page' : undefined}
						class="inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {isActive(item)
							? 'border-primary text-primary'
							: 'border-transparent text-muted hover:text-text'}"
					>
						{item.label}
					</a>
				{/each}
			{/if}
		</nav>
	</div>

	<!-- Desktop left sidebar (>= lg) -->
	<aside
		class="hidden w-56 shrink-0 border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start lg:flex-col lg:justify-between lg:overflow-y-auto lg:p-4"
	>
		<div class="space-y-6">
			<a
				href="/app"
				class="block rounded-sm px-2 py-1 text-base font-bold text-text hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				IT Help Desk
			</a>

			<nav aria-label="Main navigation" class="space-y-1">
				{#each primaryNav as item}
					<a
						href={item.href}
						aria-current={isActive(item) ? 'page' : undefined}
						class="flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {isActive(item)
							? 'bg-surface-subtle text-primary'
							: 'text-muted hover:bg-surface-subtle hover:text-text'}"
					>
						{item.label}
					</a>
				{/each}

				{#if profile.role === 'admin'}
					<div class="pt-4">
						<p class="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted">Admin</p>
						{#each adminNav as item}
							<a
								href={item.href}
								aria-current={isActive(item) ? 'page' : undefined}
								class="flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {isActive(item)
									? 'bg-surface-subtle text-primary'
									: 'text-muted hover:bg-surface-subtle hover:text-text'}"
							>
								{item.label}
							</a>
						{/each}
					</div>
				{/if}
			</nav>
		</div>

		<div class="space-y-3 border-t border-border pt-4">
			<div class="flex items-center justify-between gap-2">
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-text">{profile.full_name}</p>
					<Badge variant={profile.role === 'admin' ? 'info' : 'neutral'} class="mt-1">
						{profile.role === 'admin' ? 'Admin' : 'Agent'}
					</Badge>
				</div>
				<ThemeToggle />
			</div>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>
					<Icon name="logout" size="sm" />
					Sign out
				</button>
			</form>
		</div>
	</aside>

	<main id="main-content" class="min-w-0 flex-1 px-4 py-6 lg:px-8">
		<div class="mx-auto max-w-5xl">
			{@render children()}
		</div>
	</main>
</div>
