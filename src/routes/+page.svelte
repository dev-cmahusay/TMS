<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import PublicShell from '$lib/components/layout/PublicShell.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import {
		prepareImageForUpload,
		type PreparedImage
	} from '$lib/client/resize-image';
	import { MAX_ATTACHMENTS, publicTicketSchema } from '$lib/schemas/ticket';
	import type { SignedUploadSlot } from '$lib/server/attachments';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let customerName = $state('');
	let customerEmail = $state('');
	let customerPhone = $state('');
	let categoryId = $state('');
	let description = $state('');
	let privacyConsent = $state(false);

	let images = $state<PreparedImage[]>([]);
	let preparingImages = $state(false);
	let imageError = $state('');
	let clientFieldErrors = $state<Record<string, string>>({});
	let submitting = $state(false);
	let uploadPhase = $state<'idle' | 'submitting' | 'uploading'>('idle');

	let submittedRef = $state('');
	let submittedMaskedEmail = $state('');
	let failedImageCount = $state(0);

	let fileInputEl: HTMLInputElement | undefined = $state();

	const serverFieldErrors = $derived(
		form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}
	);
	const fieldErrors = $derived({ ...serverFieldErrors, ...clientFieldErrors });
	const topError = $derived(form && 'error' in form ? (form.error as string) : '');

	$effect(() => {
		if (form && 'values' in form && form.values) {
			const v = form.values as Record<string, unknown>;
			if (typeof v.customer_name === 'string') customerName = v.customer_name;
			if (typeof v.customer_email === 'string') customerEmail = v.customer_email;
			if (typeof v.customer_phone === 'string') customerPhone = v.customer_phone;
			if (typeof v.category_id === 'string') categoryId = v.category_id;
			if (typeof v.description === 'string') description = v.description;
			if (typeof v.privacy_consent === 'boolean') privacyConsent = v.privacy_consent;
		}
	});

	function formatSize(bytes: number): string {
		if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function handleFilesSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = '';
		if (files.length === 0) return;

		imageError = '';
		if (images.length + files.length > MAX_ATTACHMENTS) {
			imageError = 'You can attach up to 3 images.';
			return;
		}

		preparingImages = true;
		const nextImages: PreparedImage[] = [...images];

		for (const file of files) {
			try {
				const prepared = await prepareImageForUpload(file);
				nextImages.push(prepared);
			} catch (err) {
				imageError =
					err instanceof Error
						? err.message
						: 'This image could not be prepared. Try another photo or submit without it.';
			}
		}

		images = nextImages;
		preparingImages = false;
	}

	function removeImage(index: number) {
		const target = images[index];
		if (target) {
			URL.revokeObjectURL(target.previewUrl);
		}
		images = images.filter((_, i) => i !== index);
		imageError = '';
	}

	function resetTurnstile() {
		const win = window as unknown as { turnstile?: { reset?: () => void } };
		win.turnstile?.reset?.();
	}

	function resetForm() {
		for (const img of images) {
			URL.revokeObjectURL(img.previewUrl);
		}
		customerName = '';
		customerEmail = '';
		customerPhone = '';
		categoryId = '';
		description = '';
		privacyConsent = false;
		images = [];
		imageError = '';
		clientFieldErrors = {};
		submittedRef = '';
		submittedMaskedEmail = '';
		failedImageCount = 0;
		uploadPhase = 'idle';
		resetTurnstile();
	}

	async function uploadAndFinalize(ticketId: string, slots: SignedUploadSlot[]) {
		const uploadedPaths: string[] = [];
		let failed = Math.max(0, images.length - slots.length);

		for (let i = 0; i < Math.min(images.length, slots.length); i++) {
			const img = images[i];
			const slot = slots[i];
			if (!img || !slot) continue;

			try {
				const res = await fetch(slot.signedUrl, {
					method: 'PUT',
					headers: { 'Content-Type': img.mimeType },
					body: img.blob
				});
				if (res.ok) {
					uploadedPaths.push(slot.path);
				} else {
					failed += 1;
				}
			} catch {
				failed += 1;
			}
		}

		if (uploadedPaths.length > 0) {
			try {
				const body = new FormData();
				body.set('ticket_id', ticketId);
				body.set('paths', JSON.stringify(uploadedPaths));
				const res = await fetch('?/finalize', { method: 'POST', body });
				const actionResult = deserialize(await res.text());
				if (actionResult.type === 'success' && actionResult.data) {
					const d = actionResult.data as { failed?: number };
					failed += Number(d.failed ?? 0);
				} else {
					failed += uploadedPaths.length;
				}
			} catch {
				failed += uploadedPaths.length;
			}
		}

		return failed;
	}
</script>

<svelte:head>
	{#if data.turnstileSiteKey}
		<script
			src="https://challenges.cloudflare.com/turnstile/v0/api.js"
			async
			defer
		></script>
	{/if}
</svelte:head>

<PublicShell title="Submit a request — IT Help Desk">
	<Card>
		{#if submittedRef}
			<div class="space-y-5">
				<PageHeader title="Request received" />
				<Alert variant="success">
					Request received. We sent a confirmation to {submittedMaskedEmail}. Reply to that email if
					you need to add details.
				</Alert>

				<div class="rounded-md border border-border bg-surface-subtle p-4 text-center">
					<p class="text-xs font-medium uppercase tracking-wide text-muted">Reference number</p>
					<p class="mt-1 font-mono text-2xl font-bold text-text tabular-nums">{submittedRef}</p>
				</div>

				{#if failedImageCount > 0}
					<Alert variant="warning">
						Your request was submitted ({submittedRef}), but {failedImageCount}
						{failedImageCount === 1 ? 'image' : 'images'} could not be uploaded. You can reply to the
						confirmation email with the photo.
					</Alert>
				{/if}

				<Button variant="secondary" fullWidth onclick={resetForm}>
					Submit another request
				</Button>
			</div>
		{:else}
			<PageHeader
				title="Submit a tech support request"
				subtitle="For school staff. Tell us what needs fixing — we'll email your reference number and updates."
			/>

			<noscript>
				<Alert variant="warning" class="mb-4">
					Please enable JavaScript to submit this form.
				</Alert>
			</noscript>

			{#if data.categories.length === 0}
				<Alert variant="warning">
					The request form is temporarily unavailable. Please contact the IT office.
				</Alert>
			{:else}
				{#if topError}
					<Alert variant="danger" class="mb-4">{topError}</Alert>
				{/if}

				<form
					method="POST"
					action="?/create"
					novalidate
					class="space-y-4"
					use:enhance={({ formData, cancel }) => {
						clientFieldErrors = {};
						const check = publicTicketSchema.safeParse({
							customer_name: customerName,
							customer_email: customerEmail,
							customer_phone: customerPhone,
							category_id: categoryId,
							description,
							privacy_consent: privacyConsent
						});

						if (!check.success) {
							const errs: Record<string, string> = {};
							for (const issue of check.error.issues) {
								const key = String(issue.path[0] ?? 'form');
								if (!errs[key]) errs[key] = issue.message;
							}
							clientFieldErrors = errs;
							cancel();
							return;
						}

						if (images.length > 0) {
							formData.set(
								'declared_uploads',
								JSON.stringify(images.map((img) => ({ mime_type: img.mimeType })))
							);
						}

						submitting = true;
						uploadPhase = 'submitting';

						return async ({ result }) => {
							if (result.type === 'success' && result.data && 'created' in result.data) {
								const payload = result.data as {
									ref: string;
									ticketId: string;
									maskedEmail: string;
									uploads: SignedUploadSlot[];
								};
								let failed = 0;
								if (images.length > 0) {
									uploadPhase = 'uploading';
									failed = await uploadAndFinalize(payload.ticketId, payload.uploads ?? []);
								}
								submittedRef = payload.ref;
								submittedMaskedEmail = payload.maskedEmail;
								failedImageCount = failed;
							} else {
								await applyAction(result);
								resetTurnstile();
							}
							submitting = false;
							uploadPhase = 'idle';
						};
					}}
				>
					<Field
						id="customer_name"
						label="Your name"
						required
						error={fieldErrors.customer_name}
					>
						{#snippet children(describedBy)}
							<Input
								id="customer_name"
								name="customer_name"
								autocomplete="name"
								required
								maxlength={100}
								bind:value={customerName}
								invalid={Boolean(fieldErrors.customer_name)}
								aria-describedby={describedBy}
								placeholder="Juan Dela Cruz"
							/>
						{/snippet}
					</Field>

					<div class="grid gap-4 sm:grid-cols-2">
						<Field
							id="customer_email"
							label="Email address"
							required
							hint="Updates will be sent here."
							error={fieldErrors.customer_email}
						>
							{#snippet children(describedBy)}
								<Input
									id="customer_email"
									name="customer_email"
									type="email"
									autocomplete="email"
									required
									maxlength={254}
									bind:value={customerEmail}
									invalid={Boolean(fieldErrors.customer_email)}
									aria-describedby={describedBy}
									placeholder="name@school.edu.ph"
								/>
							{/snippet}
						</Field>

						<Field
							id="customer_phone"
							label="Phone number (optional)"
							error={fieldErrors.customer_phone}
						>
							{#snippet children(describedBy)}
								<Input
									id="customer_phone"
									name="customer_phone"
									type="tel"
									autocomplete="tel"
									maxlength={20}
									bind:value={customerPhone}
									invalid={Boolean(fieldErrors.customer_phone)}
									aria-describedby={describedBy}
									placeholder="0917 123 4567"
								/>
							{/snippet}
						</Field>
					</div>

					<Field id="category_id" label="Category" required error={fieldErrors.category_id}>
						{#snippet children(describedBy)}
							<Select
								id="category_id"
								name="category_id"
								required
								bind:value={categoryId}
								invalid={Boolean(fieldErrors.category_id)}
								aria-describedby={describedBy}
							>
								<option value="">Choose a category</option>
								{#each data.categories as cat}
									<option value={String(cat.id)}>{cat.name}</option>
								{/each}
							</Select>
						{/snippet}
					</Field>

					<Field
						id="description"
						label="Describe the problem"
						required
						error={fieldErrors.description}
					>
						{#snippet children(describedBy)}
							<Textarea
								id="description"
								name="description"
								rows={5}
								required
								maxlength={5000}
								showCount
								bind:value={description}
								invalid={Boolean(fieldErrors.description)}
								aria-describedby={describedBy}
								placeholder="What happened? Include the room or building if relevant."
							/>
						{/snippet}
					</Field>

					<!-- Optional photo attachments -->
					<div class="space-y-2">
						<p class="text-sm font-medium text-text">Photos (optional, up to 3)</p>
						<div class="rounded-md border border-dashed border-border-strong bg-surface-subtle p-4">
							<input
								bind:this={fileInputEl}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								multiple
								class="sr-only"
								onchange={handleFilesSelected}
							/>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<p class="text-xs text-muted">
									JPEG, PNG, or WebP · {images.length} of {MAX_ATTACHMENTS} attached · resized
									automatically (max 5 MB each)
								</p>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									disabled={images.length >= MAX_ATTACHMENTS || preparingImages}
									loading={preparingImages}
									onclick={() => fileInputEl?.click()}
								>
									<Icon name="paperclip" size="xs" />
									{preparingImages ? 'Preparing…' : 'Add photos'}
								</Button>
							</div>

							{#if images.length > 0}
								<div class="mt-3 grid grid-cols-3 gap-3">
									{#each images as img, index}
										<div class="relative overflow-hidden rounded-md border border-border bg-surface">
											<img
												src={img.previewUrl}
												alt="Selected photo {index + 1}"
												class="aspect-square w-full object-cover"
											/>
											<button
												type="button"
												onclick={() => removeImage(index)}
												aria-label="Remove photo {index + 1}"
												class="absolute top-1 right-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-surface/90 text-text shadow-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
											>
												<Icon name="x" size="xs" />
											</button>
											<span
												class="block truncate px-2 py-1 font-mono text-xs text-muted tabular-nums"
											>
												{formatSize(img.sizeBytes)}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						{#if imageError || fieldErrors.images}
							<p role="alert" class="text-sm text-danger">{imageError || fieldErrors.images}</p>
						{/if}
					</div>

					<!-- Privacy consent -->
					<div class="space-y-1">
						<label class="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm text-text">
							<input
								type="checkbox"
								name="privacy_consent"
								bind:checked={privacyConsent}
								class="mt-1 h-4 w-4 shrink-0 rounded-sm border-border-strong accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
							/>
							<span>
								I agree to the
								<a
									href="/privacy"
									class="font-medium text-primary underline hover:text-primary-hover"
								>
									privacy notice
								</a>
								so IT staff can respond to my request.
							</span>
						</label>
						{#if fieldErrors.privacy_consent}
							<p role="alert" class="text-sm text-danger">{fieldErrors.privacy_consent}</p>
						{/if}
					</div>

					<!-- Turnstile widget -->
					{#if data.turnstileSiteKey}
						<div class="min-h-16">
							<div class="cf-turnstile" data-sitekey={data.turnstileSiteKey}></div>
						</div>
					{/if}

					<Button
						type="submit"
						variant="primary"
						fullWidth
						loading={submitting}
						disabled={preparingImages}
					>
						{uploadPhase === 'uploading'
							? 'Uploading photos…'
							: submitting
								? 'Submitting…'
								: 'Submit request'}
					</Button>
				</form>
			{/if}
		{/if}
	</Card>
</PublicShell>
