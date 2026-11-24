import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditAction, AuditEntityType, Database, Json } from '$lib/database.types';
import { logError } from '$lib/server/log';

export interface AuditEntryInput {
	actorId: string;
	actorName: string;
	action: AuditAction;
	entityType: AuditEntityType;
	entityId: string;
	entityLabel: string;
	summary: string;
	metadata?: Record<string, Json | undefined>;
}

/**
 * Appends one or more immutable audit records using the authenticated staff client
 * (RLS guarantees actor_id === auth.uid()). Errors are logged without breaking the caller's UX.
 */
export async function recordAuditLogs(
	supabase: SupabaseClient<Database>,
	entries: AuditEntryInput[]
): Promise<void> {
	if (entries.length === 0) return;

	const rows = entries.map((e) => ({
		actor_id: e.actorId,
		actor_name: e.actorName,
		action: e.action,
		entity_type: e.entityType,
		entity_id: e.entityId,
		entity_label: e.entityLabel,
		summary: e.summary,
		metadata: (e.metadata ?? {}) as Json
	}));

	const { error } = await supabase.from('audit_logs').insert(rows);
	if (error) {
		logError('audit.record', error, { action: entries.map((e) => e.action).join(',') });
	}
}
