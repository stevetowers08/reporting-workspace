import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// SECURITY: Never hardcode API keys in client-side code!
// These should be configured through environment variables only
const getEnvVar = (key: string) => {
  // Handle both browser (import.meta.env) and Node.js (process.env) environments
  // @ts-expect-error Vite injects import.meta.env at build
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (viteEnv && typeof viteEnv[key] !== 'undefined') {return viteEnv[key];}
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] !== 'undefined') {return process.env[key];}
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: { schema: 'public' },
});

// Database types
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          type: string;
          location: string;
          logo_url?: string;
          status: 'active' | 'paused' | 'inactive';
          services: {
            facebookAds: boolean;
            googleAds: boolean;
            crm: boolean;
            revenue: boolean;
          };
          accounts: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
          };
          conversion_actions?: {
            facebookAds?: string;
            googleAds?: string;
          };
          shareable_link: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          location: string;
          logo_url?: string;
          status?: 'active' | 'paused' | 'inactive';
          services: {
            facebookAds: boolean;
            googleAds: boolean;
            crm: boolean;
            revenue: boolean;
          };
          accounts?: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
          };
          conversion_actions?: {
            facebookAds?: string;
            googleAds?: string;
          };
          shareable_link: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          location?: string;
          logo_url?: string;
          status?: 'active' | 'paused' | 'inactive';
          services?: {
            facebookAds: boolean;
            googleAds: boolean;
            crm: boolean;
            revenue: boolean;
          };
          accounts?: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
          };
          conversion_actions?: {
            facebookAds?: string;
            googleAds?: string;
          };
          shareable_link?: string;
          updated_at?: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          connected: boolean;
          account_name?: string;
          account_id?: string;
          last_sync?: string;
          config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          connected: boolean;
          account_name?: string;
          account_id?: string;
          last_sync?: string;
          config: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          platform?: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          connected?: boolean;
          account_name?: string;
          account_id?: string;
          last_sync?: string;
          config?: Record<string, any>;
          updated_at?: string;
        };
      };
      metrics: {
        Row: {
          id: string;
          client_id: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          date: string;
          metrics: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          date: string;
          metrics: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          platform?: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets';
          date?: string;
          metrics?: Record<string, any>;
        };
      };
      oauth_credentials: {
        Row: {
          id: string;
          platform: 'facebookAds' | 'googleAds' | 'googleSheets' | 'google-ai' | 'goHighLevel';
          client_id: string;
          client_secret: string;
          redirect_uri: string;
          scopes: string[];
          auth_url: string;
          token_url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform: 'facebookAds' | 'googleAds' | 'googleSheets' | 'google-ai' | 'goHighLevel';
          client_id: string;
          client_secret: string;
          redirect_uri: string;
          scopes: string[];
          auth_url: string;
          token_url: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          platform?: 'facebookAds' | 'googleAds' | 'googleSheets' | 'google-ai' | 'goHighLevel';
          client_id?: string;
          client_secret?: string;
          redirect_uri?: string;
          scopes?: string[];
          auth_url?: string;
          token_url?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper functions
export const supabaseHelpers = {
  // Client operations
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {throw error;}
    return data;
  },

  async getClient(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {throw error;}
    return data;
  },

  async createClient(client: Database['public']['Tables']['clients']['Insert']) {
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  async updateClient(id: string, updates: Database['public']['Tables']['clients']['Update']) {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  async deleteClient(id: string) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {throw error;}
  },

  // Integration operations
  async getIntegrations() {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {throw error;}
    return data;
  },

  async getIntegration(platform: string) {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', platform)
      .maybeSingle();

    if (error) {throw error;}
    return data;
  },

  async upsertIntegration(integration: Database['public']['Tables']['integrations']['Insert']) {
    const { data, error } = await supabase
      .from('integrations')
      .upsert({ ...integration, updated_at: new Date().toISOString() }, { onConflict: 'platform' })
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  async deleteIntegration(platform: string) {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('platform', platform);

    if (error) {throw error;}
  },

  // Metrics operations
  async getMetrics(clientId: string, platform?: string, dateRange?: { start: string; end: string }) {
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {throw error;}
    return data;
  },

  async saveMetrics(metrics: Database['public']['Tables']['metrics']['Insert']) {
    const { data, error } = await supabase
      .from('metrics')
      .insert(metrics)
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  async updateMetrics(id: string, updates: Database['public']['Tables']['metrics']['Update']) {
    const { data, error } = await supabase
      .from('metrics')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  // OAuth credentials operations
  async getOAuthCredentials(platform: string) {
    const { data, error } = await supabase
      .from('oauth_credentials')
      .select('*')
      .eq('platform', platform)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {throw error;}
    return data;
  },

  async upsertOAuthCredentials(credentials: Database['public']['Tables']['oauth_credentials']['Insert']) {
    const { data, error } = await supabase
      .from('oauth_credentials')
      .upsert({ ...credentials, updated_at: new Date().toISOString() }, { onConflict: 'platform' })
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  async deleteOAuthCredentials(platform: string) {
    const { error } = await supabase
      .from('oauth_credentials')
      .delete()
      .eq('platform', platform);

    if (error) {throw error;}
  },

  // Utility functions
  async healthCheck() {
    try {
      const { error } = await supabase
        .from('clients')
        .select('count')
        .limit(1);

      return { healthy: !error, error: error?.message };
    } catch (error) {
      return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

export default supabase;
