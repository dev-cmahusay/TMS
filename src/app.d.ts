import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database, UserRole } from '$lib/database.types';

export interface ActiveProfile {
	id: string;
	full_name: string;
	role: UserRole;
	is_active: boolean;
}

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			user: User | null;
			profile: ActiveProfile | null;
		}
	}
}

export {};
