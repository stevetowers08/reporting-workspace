/**
 * ShareLinkModal - Compact modal for sharing groups (matches client share link design)
 */

import React, { useState } from 'react';
import { X, Calendar, Check, Copy, TrendingUp, Users } from 'lucide-react';
import { GroupWithClients } from '@/types/groups';

type ShareType = 'lastMonth' | 'live';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupWithClients;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const [copiedType, setCopiedType] = useState<ShareType | null>(null);

  const getLastMonthName = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth.toLocaleDateString('en-US', { month: 'short' });
  };

  const generateShareUrl = (type: ShareType): string => {
    const baseUrl = `${window.location.origin}/share/group/${group.id}`;
    if (type === 'lastMonth') {
      return `${baseUrl}?type=lastMonth`;
    }
    return baseUrl;
  };

  const handleCopyLink = async (type: ShareType) => {
    const url = generateShareUrl(type);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-72 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-800">Share Link</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Options */}
        <div className="p-2">
          {/* Last Month Option */}
          <button
            onClick={() => handleCopyLink('lastMonth')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="p-1.5 bg-blue-50 rounded-md">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">{getLastMonthName()} Report</p>
              <p className="text-xs text-slate-400">Fixed date range</p>
            </div>
            <div className="flex-shrink-0">
              {copiedType === 'lastMonth' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
              )}
            </div>
          </button>

          {/* Live Report Option */}
          <button
            onClick={() => handleCopyLink('live')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
          >
            <div className="p-1.5 bg-green-50 rounded-md">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">Live Report</p>
              <p className="text-xs text-slate-400">Adjustable dates</p>
            </div>
            <div className="flex-shrink-0">
              {copiedType === 'live' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
              )}
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">
            Click to copy • Recipients can select venues on the page
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;
