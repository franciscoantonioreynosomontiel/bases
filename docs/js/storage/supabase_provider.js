/**
 * Supabase Storage Provider
 * Handles cloud persistence for database projects.
 * Required Table: projects (id uuid PK, name text, data jsonb, created_at timestamptz)
 */
export class SupabaseProvider {
    constructor() {
        const supabaseUrl = 'https://ojpyfjgkffmzwvukjagf.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qcHlmamdrZmZtend2dWtqYWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNDIwMzYsImV4cCI6MjA3OTcxODAzNn0.dlVYmoMumBse_O1PLBx0FeNITqY4YktefD6l_uonSgo';
        
        if (window.supabase) {
            this.client = window.supabase.createClient(supabaseUrl, supabaseKey);
        } else {
            console.error('Supabase library not loaded');
        }
    }

    async saveProject(name, data) {
        if (!this.client) return { error: 'Supabase client not initialized' };

        const { data: result, error } = await this.client
            .from('projects')
            .upsert({ 
                name: name, 
                data: data,
                updated_at: new Date()
            }, { onConflict: 'name' }) // Simplification: upsert by name for now
            .select();

        return { data: result, error };
    }

    async listProjects() {
        if (!this.client) return { error: 'Supabase client not initialized' };

        const { data, error } = await this.client
            .from('projects')
            .select('id, name, created_at, updated_at')
            .order('updated_at', { ascending: false });

        return { data, error };
    }

    async getProject(id) {
        if (!this.client) return { error: 'Supabase client not initialized' };

        const { data, error } = await this.client
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        return { data, error };
    }
}
