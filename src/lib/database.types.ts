export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type TicketStatus =
	| 'new'
	| 'assigned'
	| 'in_progress'
	| 'waiting_on_customer'
	| 'resolved';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type UserRole = 'agent' | 'admin';
export type EmailStatus = 'pending' | 'sent' | 'failed';
export type AuditAction =
	| 'ticket.assigned'
	| 'ticket.reassigned'
	| 'ticket.unassigned'
	| 'ticket.status_changed'
	| 'ticket.priority_changed'
	| 'ticket.reopened'
	| 'staff.created'
	| 'staff.updated'
	| 'category.created'
	| 'category.updated';
export type AuditEntityType = 'ticket' | 'profile' | 'category';

export interface DashboardAgentStat {
	agent_id: string | null;
	agent_name: string;
	open_count: number;
	resolved_30d_count: number;
}

export interface DashboardStats {
	open_total: number;
	by_status: {
		new: number;
		assigned: number;
		in_progress: number;
		waiting_on_customer: number;
	};
	resolved_30d: number;
	avg_resolution_seconds: number | null;
	per_agent: DashboardAgentStat[];
}

export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					full_name: string;
					role: UserRole;
					is_active: boolean;
					created_at: string;
				};
				Insert: {
					id: string;
					full_name: string;
					role?: UserRole;
					is_active?: boolean;
					created_at?: string;
				};
				Update: {
					id?: string;
					full_name?: string;
					role?: UserRole;
					is_active?: boolean;
					created_at?: string;
				};
				Relationships: [];
			};
			categories: {
				Row: {
					id: number;
					name: string;
					is_active: boolean;
					sort_order: number;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: never;
					name: string;
					is_active?: boolean;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: never;
					name?: string;
					is_active?: boolean;
					sort_order?: number;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			tickets: {
				Row: {
					id: string;
					ref: string;
					customer_name: string;
					customer_email: string;
					customer_phone: string | null;
					category_id: number;
					description: string;
					status: TicketStatus;
					priority: TicketPriority;
					assignee_id: string | null;
					created_at: string;
					updated_at: string;
					resolved_at: string | null;
				};
				Insert: {
					id?: string;
					ref?: string;
					customer_name: string;
					customer_email: string;
					customer_phone?: string | null;
					category_id: number;
					description: string;
					status?: TicketStatus;
					priority?: TicketPriority;
					assignee_id?: string | null;
					created_at?: string;
					updated_at?: string;
					resolved_at?: string | null;
				};
				Update: {
					id?: string;
					ref?: string;
					customer_name?: string;
					customer_email?: string;
					customer_phone?: string | null;
					category_id?: number;
					description?: string;
					status?: TicketStatus;
					priority?: TicketPriority;
					assignee_id?: string | null;
					created_at?: string;
					updated_at?: string;
					resolved_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'tickets_category_id_fkey';
						columns: ['category_id'];
						isOneToOne: false;
						referencedRelation: 'categories';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'tickets_assignee_id_fkey';
						columns: ['assignee_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			ticket_messages: {
				Row: {
					id: string;
					ticket_id: string;
					author_id: string | null;
					body: string;
					is_internal: boolean;
					email_status: EmailStatus | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					ticket_id: string;
					author_id?: string | null;
					body: string;
					is_internal?: boolean;
					email_status?: EmailStatus | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					ticket_id?: string;
					author_id?: string | null;
					body?: string;
					is_internal?: boolean;
					email_status?: EmailStatus | null;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'ticket_messages_ticket_id_fkey';
						columns: ['ticket_id'];
						isOneToOne: false;
						referencedRelation: 'tickets';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'ticket_messages_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			ticket_attachments: {
				Row: {
					id: string;
					ticket_id: string;
					storage_path: string;
					mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
					size_bytes: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					ticket_id: string;
					storage_path: string;
					mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
					size_bytes: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					ticket_id?: string;
					storage_path?: string;
					mime_type?: 'image/jpeg' | 'image/png' | 'image/webp';
					size_bytes?: number;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'ticket_attachments_ticket_id_fkey';
						columns: ['ticket_id'];
						isOneToOne: false;
						referencedRelation: 'tickets';
						referencedColumns: ['id'];
					}
				];
			};
			rate_limits: {
				Row: {
					key: string;
					window_start: string;
					count: number;
				};
				Insert: {
					key: string;
					window_start: string;
					count?: number;
				};
				Update: {
					key?: string;
					window_start?: string;
					count?: number;
				};
				Relationships: [];
			};
			audit_logs: {
				Row: {
					id: string;
					actor_id: string | null;
					actor_name: string;
					action: AuditAction;
					entity_type: AuditEntityType;
					entity_id: string;
					entity_label: string;
					summary: string;
					metadata: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					actor_id?: string | null;
					actor_name: string;
					action: AuditAction;
					entity_type: AuditEntityType;
					entity_id: string;
					entity_label: string;
					summary: string;
					metadata?: Json;
					created_at?: string;
				};
				Update: {
					id?: never;
					actor_id?: never;
					actor_name?: never;
					action?: never;
					entity_type?: never;
					entity_id?: never;
					entity_label?: never;
					summary?: never;
					metadata?: never;
					created_at?: never;
				};
				Relationships: [
					{
						foreignKeyName: 'audit_logs_actor_id_fkey';
						columns: ['actor_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: Record<string, never>;
		Functions: {
			is_staff: {
				Args: Record<PropertyKey, never>;
				Returns: boolean;
			};
			is_admin: {
				Args: Record<PropertyKey, never>;
				Returns: boolean;
			};
			check_rate_limit: {
				Args: {
					p_key: string;
					p_limit: number;
				};
				Returns: boolean;
			};
			dashboard_stats: {
				Args: Record<PropertyKey, never>;
				Returns: Json;
			};
		};
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};
