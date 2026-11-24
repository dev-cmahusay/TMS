<script lang="ts">
	import PublicShell from '$lib/components/layout/PublicShell.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
</script>

<PublicShell title="Privacy notice — IT Help Desk">
	<Card>
		<PageHeader
			title="Privacy notice"
			subtitle="How your support request data is handled (Data Privacy Act of 2012, RA 10173)"
			backHref="/"
			backLabel="Back to request form"
		/>

		<div class="space-y-5 text-sm leading-relaxed text-text">
			<section class="space-y-1.5">
				<h2 class="text-base font-semibold">Who this form is for</h2>
				<p class="text-muted">
					This help desk is intended for school staff (teachers and office personnel). Students
					should report technical issues through their adviser or subject teacher.
				</p>
			</section>

			<section class="space-y-1.5">
				<h2 class="text-base font-semibold">What information we collect</h2>
				<p class="text-muted">
					We collect your name, email address, optional phone number, problem category, description,
					and any photos you attach. To prevent spam, we also store a one-way cryptographic hash of
					your network address and email for up to 24 hours for rate limiting.
				</p>
			</section>

			<section class="space-y-1.5">
				<h2 class="text-base font-semibold">Why we collect it &amp; who can see it</h2>
				<p class="text-muted">
					Your information is used solely to track, investigate, and resolve your technical support
					request and to send you email updates. Only authorized school IT staff and administrators
					can view tickets and attachments.
				</p>
			</section>

			<section class="space-y-1.5">
				<h2 class="text-base font-semibold">Where data is stored</h2>
				<p class="text-muted">
					Ticket records and private photo attachments are stored securely in Supabase (Singapore
					region) with row-level access controls. Notification emails are delivered via Resend.
				</p>
			</section>

			<section class="space-y-1.5">
				<h2 class="text-base font-semibold">Retention &amp; contact</h2>
				<p class="text-muted">
					Records are retained for IT operations and reporting in accordance with school policy. To
					request correction or removal of your information, reply to any ticket email or contact
					the school IT office directly.
				</p>
			</section>
		</div>
	</Card>
</PublicShell>
