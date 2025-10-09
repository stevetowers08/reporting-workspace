import { Button } from '@/components/ui/button-simple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label-simple';
import { Textarea } from '@/components/ui/textarea';
import { AIInsightsService, AISystemPrompt } from '@/services/ai/aiInsightsService';
import { Bot, Save, TestTube } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface AIInsightsTabProps {}

export const AIInsightsTab: React.FC<AIInsightsTabProps> = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing system prompt on mount
  useEffect(() => {
    loadSystemPrompt();
  }, []);

  const loadSystemPrompt = async () => {
    try {
      setLoading(true);
      const prompts = await AIInsightsService.getAllSystemPrompts();
      if (prompts.length > 0 && prompts[0].promptText) {
        setSystemPrompt(prompts[0].promptText);
      }
    } catch (error) {
      console.error('Error loading system prompt:', error);
      setMessage({ type: 'error', text: 'Failed to load system prompt' });
    } finally {
      setLoading(false);
    }
  };

  const saveSystemPrompt = async () => {
    if (!systemPrompt || !systemPrompt.trim()) {
      setMessage({ type: 'error', text: 'System prompt cannot be empty' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const promptData: Omit<AISystemPrompt, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Main System Prompt',
        promptText: systemPrompt.trim(),
        isActive: true,
        description: 'Main system prompt for AI insights generation'
      };

      await AIInsightsService.createSystemPrompt(promptData);
      setMessage({ type: 'success', text: 'System prompt saved successfully' });
    } catch (error) {
      console.error('Error saving system prompt:', error);
      setMessage({ type: 'error', text: 'Failed to save system prompt' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setMessage(null);

      const isConnected = await AIInsightsService.testAIConnection();
      if (isConnected) {
        setMessage({ type: 'success', text: 'AI connection test successful' });
      } else {
        setMessage({ type: 'error', text: 'AI connection test failed' });
      }
    } catch (error) {
      console.error('Error testing AI connection:', error);
      setMessage({ type: 'error', text: 'AI connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI Insights Configuration</h2>
          <p className="text-sm text-slate-600 mt-1">
            Configure the system prompt that will be used to generate AI insights for your clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={testConnection}
            disabled={testing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <Card className="bg-white border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Bot className="h-5 w-5" />
            System Prompt Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-sm font-medium text-slate-700">
              System Prompt
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter the system prompt that will guide AI insights generation..."
              className="min-h-[300px] resize-none"
              disabled={loading}
            />
            <p className="text-xs text-slate-500">
              This prompt will be used to generate AI insights for all clients. Be specific about the type of insights you want generated.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveSystemPrompt}
              disabled={saving || loading || !systemPrompt || !systemPrompt.trim()}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save System Prompt'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• The system prompt defines how AI should analyze marketing data</li>
          <li>• AI insights will be generated based on this prompt for all clients</li>
          <li>• Use clear, specific instructions for best results</li>
          <li>• Test the connection to ensure AI services are working properly</li>
        </ul>
      </div>
    </div>
  );
};