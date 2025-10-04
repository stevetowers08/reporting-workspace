import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { AIInsightsResponse, GoogleAiService } from './googleAiService';

export interface AIInsightsConfig {
  id: string;
  clientId: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastGenerated?: string;
  nextGeneration?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISystemPrompt {
  id: string;
  name: string;
  description?: string;
  promptText: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIInsightsHistory {
  id: string;
  clientId: string;
  generatedAt: string;
  insightsData: AIInsightsResponse;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export class AIInsightsService {
  // System Prompts Management
  static async getAllSystemPrompts(): Promise<AISystemPrompt[]> {
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error fetching system prompts', error);
      return [];
    }
  }

  static async getActiveSystemPrompt(): Promise<AISystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error fetching active system prompt', error);
      return null;
    }
  }

  static async createSystemPrompt(prompt: Omit<AISystemPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<AISystemPrompt> {
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .insert([prompt])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error creating system prompt', error);
      throw error;
    }
  }

  static async updateSystemPrompt(id: string, updates: Partial<AISystemPrompt>): Promise<AISystemPrompt> {
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error updating system prompt', error);
      throw error;
    }
  }

  static async setActiveSystemPrompt(id: string): Promise<void> {
    try {
      // First, deactivate all prompts
      await supabase
        .from('ai_system_prompts')
        .update({ is_active: false });

      // Then activate the selected one
      const { error } = await supabase
        .from('ai_system_prompts')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error setting active system prompt', error);
      throw error;
    }
  }

  static async deleteSystemPrompt(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_system_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error deleting system prompt', error);
      throw error;
    }
  }

  // Client AI Insights Configuration
  static async getClientAIConfig(clientId: string): Promise<AIInsightsConfig | null> {
    try {
      const { data, error } = await supabase
        .from('ai_insights_config')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error fetching client AI config', error);
      return null;
    }
  }

  static async createOrUpdateClientAIConfig(
    clientId: string, 
    config: Omit<AIInsightsConfig, 'id' | 'clientId' | 'createdAt' | 'updatedAt'>
  ): Promise<AIInsightsConfig> {
    try {
      // Check if config exists
      const existing = await this.getClientAIConfig(clientId);
      
      if (existing) {
        // Update existing config
        const { data, error } = await supabase
          .from('ai_insights_config')
          .update({
            enabled: config.enabled,
            frequency: config.frequency,
            updated_at: new Date().toISOString()
          })
          .eq('client_id', clientId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new config
        const { data, error } = await supabase
          .from('ai_insights_config')
          .insert([{ 
            client_id: clientId, 
            enabled: config.enabled,
            frequency: config.frequency,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error creating/updating client AI config', error);
      // Don't throw error - just log it so form submission can continue
      console.warn('AI Insights config update failed, but continuing with form submission:', error);
      return {
        id: '',
        clientId,
        enabled: config.enabled,
        frequency: config.frequency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  // AI Insights Generation
  static async generateInsightsForClient(
    clientId: string,
    dashboardData: any,
    period: string
  ): Promise<AIInsightsResponse> {
    try {
      debugLogger.info('AIInsightsService', 'Generating insights for client', { clientId, period });

      // Get active system prompt
      const systemPrompt = await this.getActiveSystemPrompt();
      if (!systemPrompt) {
        throw new Error('No active system prompt found');
      }

      // Generate insights using Google AI
      const insights = await GoogleAiService.generateInsights(
        dashboardData,
        systemPrompt.promptText,
        period
      );

      // Save to history
      await this.saveInsightsHistory(clientId, insights, period);

      // Update last generated timestamp
      await this.updateLastGenerated(clientId);

      return insights;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error generating insights for client', error);
      throw error;
    }
  }

  static async getClientInsightsHistory(
    clientId: string,
    limit: number = 10
  ): Promise<AIInsightsHistory[]> {
    try {
      const { data, error } = await supabase
        .from('ai_insights_history')
        .select('*')
        .eq('client_id', clientId)
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error fetching insights history', error);
      return [];
    }
  }

  static async getLatestInsights(clientId: string): Promise<AIInsightsHistory | null> {
    try {
      const { data, error } = await supabase
        .from('ai_insights_history')
        .select('*')
        .eq('client_id', clientId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error fetching latest insights', error);
      return null;
    }
  }

  private static async saveInsightsHistory(
    clientId: string,
    insights: AIInsightsResponse,
    period: string
  ): Promise<void> {
    try {
      const now = new Date();
      const periodStart = this.getPeriodStartDate(period);
      const periodEnd = now.toISOString().split('T')[0];

      const { error } = await supabase
        .from('ai_insights_history')
        .insert([{
          client_id: clientId,
          insights_data: insights,
          period_start: periodStart,
          period_end: periodEnd
        }]);

      if (error) throw error;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error saving insights history', error);
      throw error;
    }
  }

  private static async updateLastGenerated(clientId: string): Promise<void> {
    try {
      const now = new Date();
      const { error } = await supabase
        .from('ai_insights_config')
        .update({ 
          last_generated: now.toISOString(),
          next_generation: this.calculateNextGeneration(now)
        })
        .eq('client_id', clientId);

      if (error) throw error;
    } catch (error) {
      debugLogger.error('AIInsightsService', 'Error updating last generated timestamp', error);
    }
  }

  private static getPeriodStartDate(period: string): string {
    const now = new Date();
    const start = new Date(now);
    
    switch (period) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '14d':
        start.setDate(now.getDate() - 14);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case 'lastMonth':
        // Last month: e.g., if today is Oct 10th, show Sep 1st to Sep 30th
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }
    
    return start.toISOString().split('T')[0];
  }

  private static calculateNextGeneration(lastGenerated: Date): string {
    const next = new Date(lastGenerated);
    next.setDate(next.getDate() + 7); // Default to weekly
    return next.toISOString();
  }

  // Utility methods
  static async testAIConnection(): Promise<boolean> {
    return GoogleAiService.testConnection();
  }
}
