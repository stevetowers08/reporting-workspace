import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

interface GHLReconnectPromptProps {
  onReconnect: () => void;
}

export const GHLReconnectPrompt: React.FC<GHLReconnectPromptProps> = ({ onReconnect }) => {
  return (
    <Card className="bg-yellow-50 border-yellow-200 shadow-sm p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            GoHighLevel Connection Expired
          </h3>
          <p className="text-sm text-yellow-700 mb-4">
            Your GoHighLevel connection has expired and needs to be reconnected to continue accessing contact data and analytics.
          </p>
          <Button 
            onClick={onReconnect}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reconnect GoHighLevel
          </Button>
        </div>
      </div>
    </Card>
  );
};
