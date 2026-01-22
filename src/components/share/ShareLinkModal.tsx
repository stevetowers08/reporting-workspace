import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, Copy, Link2, TrendingUp, X } from 'lucide-react';
import React, { useState } from 'react';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

type ShareType = 'lastMonth' | 'live';

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  clientId,
  clientName
}) => {
  const [selectedType, setSelectedType] = useState<ShareType>('lastMonth');
  const [copied, setCopied] = useState(false);

  // Calculate last month's name for display
  const getLastMonthName = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const generateShareUrl = (type: ShareType): string => {
    const baseUrl = `${window.location.origin}/share/${clientId}`;
    if (type === 'lastMonth') {
      return `${baseUrl}?type=lastMonth`;
    }
    return baseUrl;
  };

  const handleCopyLink = async () => {
    const url = generateShareUrl(selectedType);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Share Report</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Choose how you want to share the report for <span className="font-medium text-slate-900">{clientName}</span>
          </p>

          {/* Share Type Options */}
          <div className="space-y-3">
            {/* Last Month Option */}
            <button
              onClick={() => setSelectedType('lastMonth')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === 'lastMonth'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedType === 'lastMonth' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Calendar className={`h-5 w-5 ${
                    selectedType === 'lastMonth' ? 'text-blue-600' : 'text-slate-500'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Last Month's Report</h3>
                    {selectedType === 'lastMonth' && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Fixed to <span className="font-medium">{getLastMonthName()}</span> data only.
                    Viewer cannot change the date range.
                  </p>
                </div>
              </div>
            </button>

            {/* Live Report Option */}
            <button
              onClick={() => setSelectedType('live')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === 'live'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedType === 'live' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <TrendingUp className={`h-5 w-5 ${
                    selectedType === 'live' ? 'text-blue-600' : 'text-slate-500'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Live Report</h3>
                    {selectedType === 'live' && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Real-time data with full date selector.
                    Viewer can choose any date range.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Preview URL */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Share link preview:</p>
            <p className="text-sm text-slate-700 font-mono break-all">
              {generateShareUrl(selectedType)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopyLink}
            className={copied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
