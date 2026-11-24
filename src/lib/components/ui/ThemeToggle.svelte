<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let isDark = $state(false);

	function detectDark(): boolean {
		const explicit = document.documentElement.dataset.theme;
		if (explicit === 'dark') return true;
		if (explicit === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	onMount(() => {
		isDark = detectDark();
	});

	function toggle() {
		const next = isDark ? 'light' : 'dark';
		isDark = next === 'dark';
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('tms-theme', next);
		} catch {
			// Ignore storage errors in private browsing.
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors duration-150 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
>
	<Icon name={isDark ? 'sun' : 'moon'} size="sm" />
</button>
