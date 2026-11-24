<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title,
		onclose,
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	} = $props();

	let dialogEl: HTMLDialogElement | undefined = $state();
	const titleId = $derived(`modal-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) {
			handleClose();
		}
	}
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby={titleId}
	onclose={handleClose}
	onclick={handleBackdropClick}
	class="m-auto w-full max-w-md rounded-lg border border-border bg-surface p-0 text-text shadow-md backdrop:bg-text/40"
>
	<div class="flex items-center justify-between border-b border-border px-5 py-4">
		<h2 id={titleId} class="text-lg font-semibold text-text">{title}</h2>
		<button
			type="button"
			onclick={handleClose}
			aria-label="Close dialog"
			class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:bg-surface-subtle hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			<Icon name="x" size="sm" />
		</button>
	</div>
	<div class="px-5 py-4 text-sm text-text">
		{@render children()}
	</div>
	{#if footer}
		<div class="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
			{@render footer()}
		</div>
	{/if}
</dialog>
