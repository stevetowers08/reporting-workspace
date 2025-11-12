import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { DatabaseService } from '@/services/data/databaseService';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';

interface KeyInsightsProps {
  data?: EventDashboardData;
  clientId?: string;
  isShared?: boolean;
  clientData?: DatabaseService.Client | null;
}

export const KeyInsights: React.FC<KeyInsightsProps> = ({ 
  data, 
  clientId, 
  isShared = false,
  clientData 
}) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const defaultContent = `• Meta Ads: ${data?.facebookMetrics?.leads || '0'} leads at $${(data?.facebookMetrics?.costPerLead || 0).toFixed(2)} CPL
• Google Ads: ${data?.googleMetrics?.leads || '0'} leads at $${(data?.googleMetrics?.costPerLead || 0).toFixed(2)} CPL`;

  useEffect(() => {
    const newContent = clientData?.custom_insights || defaultContent;
    setContent(newContent);
    
    if (editableRef.current && !isShared) {
      editableRef.current.textContent = newContent;
    }
  }, [clientData?.custom_insights, defaultContent, isShared]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleInput = () => {
    if (!editableRef.current || isShared) return;
    
    const newContent = editableRef.current.textContent || '';
    setContent(newContent);
    setIsEditing(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (!clientId || isShared) return;
      
      setIsSaving(true);
      try {
        await DatabaseService.updateClient(clientId, {
          custom_insights: newContent
        });
        
        queryClient.invalidateQueries({ queryKey: ['client-data', clientId] });
      } catch (error) {
        console.error('Failed to save custom insights:', error);
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
    }, 500);
  };

  const displayContent = clientData?.custom_insights || defaultContent;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Key Insights</h3>
        {!isShared && (
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-slate-500">Saving...</span>
            )}
            {!isSaving && !isEditing && (
              <span className="text-xs text-slate-400 italic">Click to edit</span>
            )}
          </div>
        )}
      </div>
      <div className="h-64">
        {!isShared ? (
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            className={`text-sm text-slate-800 space-y-1 outline-none focus:outline-2 focus:outline-blue-400 focus:outline-offset-2 rounded p-2 min-h-[200px] cursor-text hover:bg-slate-50 transition-colors ${
              isEditing ? 'bg-blue-50 border border-blue-200' : 'border border-transparent'
            }`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {displayContent}
          </div>
        ) : (
          <div className="text-sm text-slate-800 space-y-1" style={{ whiteSpace: 'pre-line' }}>
            {displayContent}
          </div>
        )}
      </div>
    </Card>
  );
};
