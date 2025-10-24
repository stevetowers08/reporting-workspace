import { Button } from "@/components/ui/button-simple";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label-simple";
import { DatabaseService } from "@/services/data/databaseService";
import { X } from "lucide-react";
import React, { useState } from 'react';

interface GoogleAdsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoogleAdsManagerModal: React.FC<GoogleAdsManagerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [managerAccountId, setManagerAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!managerAccountId.trim()) {
      setError('Please enter a manager account ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update the Google Ads integration config with manager account ID
      await DatabaseService.updateIntegrationConfig('googleAds', {
        manager_account_id: managerAccountId.trim()
      });

      onSuccess();
      onClose();
    } catch (_error) {
      setError('Failed to save manager account ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {return null;}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Google Ads Manager Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="manager-account-id" className="text-sm font-medium text-gray-700">
              Manager Account ID
            </Label>
            <Input
              id="manager-account-id"
              type="text"
              placeholder="e.g., 3791504588"
              value={managerAccountId}
              onChange={(e) => setManagerAccountId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your Google Ads manager account ID (numeric only)
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !managerAccountId.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Manager Account'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
