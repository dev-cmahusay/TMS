<script lang="ts">
  import { enhance } from "$app/forms";
  import Alert from "$lib/components/ui/Alert.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Field from "$lib/components/ui/Field.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import PageHeader from "$lib/components/ui/PageHeader.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let newFullName = $state("");
  let newEmail = $state("");
  let newPassword = $state("");
  let newRole = $state("agent");
  let showPassword = $state(false);
  let creating = $state(false);

  $effect(() => {
    if (form && "created" in form && form.created) {
      newFullName = "";
      newEmail = "";
      newPassword = "";
      newRole = "agent";
      showPassword = false;
    } else if (form && "createValues" in form && form.createValues) {
      const v = form.createValues as Record<string, unknown>;
      if (typeof v.full_name === "string") newFullName = v.full_name;
      if (typeof v.email === "string") newEmail = v.email;
      if (typeof v.role === "string") newRole = v.role;
    }
  });
</script>

<svelte:head>
  <title>Team — IT Help Desk</title>
</svelte:head>

<PageHeader
  title="Team"
  subtitle="Add staff accounts and manage names, roles, and access."
/>

<div class="space-y-6">
  <Card>
    <div class="mb-4">
      <h2 class="text-base font-semibold text-text">Add staff member</h2>
      <p class="mt-1 text-xs text-muted">
        Creates a ready-to-use login immediately. Share the temporary password
        securely with the new staff member.
      </p>
    </div>

    {#if form && "createError" in form && form.createError}
      <Alert variant="danger" class="mb-4">{form.createError}</Alert>
    {:else if form && "created" in form && form.created}
      <Alert variant="success" class="mb-4">
        Staff account created for {form.createdName} ({form.createdEmail}).
      </Alert>
    {/if}

    <form
      method="POST"
      action="?/create"
      class="space-y-4"
      use:enhance={() => {
        creating = true;
        return async ({ update }) => {
          await update();
          creating = false;
        };
      }}
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <Field id="new-staff-name" label="Full name" required>
          {#snippet children(describedBy)}
            <Input
              id="new-staff-name"
              name="full_name"
              required
              maxlength={100}
              bind:value={newFullName}
              placeholder="e.g., Juan Dela Cruz"
              aria-describedby={describedBy}
            />
          {/snippet}
        </Field>

        <Field id="new-staff-email" label="Email" required>
          {#snippet children(describedBy)}
            <Input
              id="new-staff-email"
              name="email"
              type="email"
              autocomplete="off"
              required
              maxlength={254}
              bind:value={newEmail}
              placeholder="agent@school.edu.ph"
              aria-describedby={describedBy}
            />
          {/snippet}
        </Field>

        <Field
          id="new-staff-password"
          label="Temporary password"
          hint="At least 8 characters."
          required
        >
          {#snippet children(describedBy)}
            <div class="flex gap-2">
              <Input
                id="new-staff-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autocomplete="new-password"
                required
                minlength={8}
                maxlength={128}
                bind:value={newPassword}
                aria-describedby={describedBy}
              />
              <Button
                type="button"
                variant="secondary"
                aria-pressed={showPassword}
                onclick={() => (showPassword = !showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
          {/snippet}
        </Field>

        <Field id="new-staff-role" label="Role">
          {#snippet children(describedBy)}
            <Select
              id="new-staff-role"
              name="role"
              bind:value={newRole}
              aria-describedby={describedBy}
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </Select>
          {/snippet}
        </Field>
      </div>

      <div class="flex justify-end">
        <Button type="submit" variant="primary" loading={creating}>
          {creating ? "Creating…" : "Create staff account"}
        </Button>
      </div>
    </form>
  </Card>

  <Alert variant="info">
    To reset a forgotten password, go to your Supabase dashboard →
    Authentication → Users.
  </Alert>

  {#if form && "teamError" in form && form.teamError}
    <Alert variant="danger">{form.teamError}</Alert>
  {:else if form && "saved" in form && form.saved}
    <Alert variant="success">Staff member updated.</Alert>
  {/if}

  <div class="space-y-3">
    {#each data.members as member}
      {@const isSelf = member.id === data.currentUserId}
      <Card>
        <form method="POST" action="?/update" class="space-y-4" use:enhance>
          <input type="hidden" name="id" value={member.id} />
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-text">
                {member.full_name}
                {#if isSelf}
                  <span class="text-xs font-normal text-muted">(you)</span>
                {/if}
              </p>
              {#if member.email}
                <p class="text-xs text-muted">{member.email}</p>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <Badge variant={member.role === "admin" ? "info" : "neutral"}>
                {member.role === "admin" ? "Admin" : "Agent"}
              </Badge>
              <Badge variant={member.is_active ? "success" : "danger"}>
                {member.is_active ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <Field id="name-{member.id}" label="Full name" required>
              {#snippet children(describedBy)}
                <Input
                  id="name-{member.id}"
                  name="full_name"
                  required
                  maxlength={100}
                  value={member.full_name}
                  aria-describedby={describedBy}
                />
              {/snippet}
            </Field>

            <Field id="role-{member.id}" label="Role">
              {#snippet children(describedBy)}
                <Select
                  id="role-{member.id}"
                  name="role"
                  disabled={isSelf}
                  value={member.role}
                  aria-describedby={describedBy}
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </Select>
              {/snippet}
            </Field>

            <Field id="active-{member.id}" label="Access">
              {#snippet children(describedBy)}
                <Select
                  id="active-{member.id}"
                  name="is_active"
                  disabled={isSelf}
                  value={member.is_active ? "true" : "false"}
                  aria-describedby={describedBy}
                >
                  <option value="true">Active</option>
                  <option value="false">Disabled</option>
                </Select>
              {/snippet}
            </Field>
          </div>

          {#if isSelf}
            <input type="hidden" name="role" value={member.role} />
            <input
              type="hidden"
              name="is_active"
              value={member.is_active ? "true" : "false"}
            />
            <p class="text-xs text-muted">
              You can't change your own role or deactivate your own account.
            </p>
          {/if}

          <div class="flex justify-end">
            <Button type="submit" size="sm" variant="primary">Save</Button>
          </div>
        </form>
      </Card>
    {/each}
  </div>
</div>
