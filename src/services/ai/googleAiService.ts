import { debugLogger } from '@/lib/debug';

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  metrics?: {
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'stable';
  };
  actionable?: string[];
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  summary: string;
  recommendations: string[];
  generatedAt: string;
}

export class GoogleAiService {
  private static readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  private static readonly MODEL_NAME = 'gemini-2.0-flash-001';

  private static getApiKey(): string {
    const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('Google AI API key not configured');
    }
    return apiKey;
  }

  static async generateInsights(
    dashboardData: any,
    systemPrompt: string,
    period: string
  ): Promise<AIInsightsResponse> {
    try {
      debugLogger.info('GoogleAiService', 'Generating AI insights', { period });

      const prompt = this.buildPrompt(dashboardData, systemPrompt, period);
      
      const response = await fetch(
        `${this.API_BASE_URL}/models/${this.MODEL_NAME}:generateContent?key=${this.getApiKey()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Google AI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No content generated from Google AI');
      }

      // Parse the AI response into structured insights
      const parsedInsights = this.parseAIResponse(generatedText);

      debugLogger.info('GoogleAiService', 'AI insights generated successfully', {
        insightsCount: parsedInsights.insights.length
      });

      return parsedInsights;

    } catch (error) {
      debugLogger.error('GoogleAiService', 'Error generating AI insights', error);
      
      // Return empty insights instead of fallback data
      return {
        insights: [],
        summary: 'Unable to generate insights at this time',
        recommendations: [],
        generatedAt: new Date().toISOString()
      };
    }
  }

  private static buildPrompt(dashboardData: any, systemPrompt: string, period: string): string {
    const periodText = period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 90 days';
    
    return `${systemPrompt}

Please analyze the following marketing data for the ${periodText} and provide actionable insights:

## Dashboard Data:
${JSON.stringify(dashboardData, null, 2)}

## Required Output Format:
Please provide your response in the following JSON format:
{
  "insights": [
    {
      "id": "unique_id",
      "title": "Insight Title",
      "description": "Detailed description of the insight",
      "type": "success|warning|info|recommendation",
      "priority": "high|medium|low",
      "metrics": {
        "value": "metric value",
        "change": "change from previous period",
        "trend": "up|down|stable"
      },
      "actionable": ["action item 1", "action item 2"]
    }
  ],
  "summary": "Overall performance summary",
  "recommendations": ["top recommendation 1", "top recommendation 2", "top recommendation 3"]
}

Focus on:
1. Performance trends and patterns
2. Cost efficiency and ROI analysis
3. Platform-specific recommendations
4. Seasonal trends and opportunities
5. Actionable next steps for optimization

Provide insights that are specific, data-driven, and actionable for event marketing optimization.`;
  }

  private static parseAIResponse(responseText: string): AIInsightsResponse {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          insights: parsed.insights || [],
          summary: parsed.summary || 'AI analysis completed',
          recommendations: parsed.recommendations || [],
          generatedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      debugLogger.warn('GoogleAiService', 'Failed to parse AI response as JSON', error);
    }

    // Fallback parsing if JSON parsing fails
    return {
      insights: [{
        id: 'fallback-1',
        title: 'AI Analysis Complete',
        description: responseText.substring(0, 200) + '...',
        type: 'info' as const,
        priority: 'medium' as const
      }],
      summary: 'AI analysis completed successfully',
      recommendations: ['Review the generated insights for actionable items'],
      generatedAt: new Date().toISOString()
    };
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/models?key=${this.getApiKey()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      return response.ok;
    } catch (error) {
      debugLogger.error('GoogleAiService', 'Connection test failed', error);
      return false;
    }
  }
}
