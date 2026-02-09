/**
 * ShareLinkModal - Modal for generating and managing share links
 */

import React, { useState } from 'react';
import { X, Link2, Copy, Check, RefreshCw, Shield, Calendar, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShareOptions, CreateShareLinkResponse, ResourceType } from '@/types/groups';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceName: string;
  existingShareUrl?: string;
  onGenerateLink: (options: ShareOptions) => Promise<CreateShareLinkResponse>;
  onRevokeLink?: () => Promise<void>;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  resourceType,
  resourceName,
  existingShareUrl,
  onGenerateLink,
  onRevokeLink,
}) => {
  const [expiration, setExpiration] = useState<ShareOptions['expiration']>('never');
  const [password, setPassword] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<CreateShareLinkResponse | null>(
    existingShareUrl
      ? { token: existingShareUrl.split('/').pop() || '', shareUrl: existingShareUrl }
      : null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const options: ShareOptions = {
        expiration,
        password: password || undefined,
        allowDownload,
      };

      const result = await onGenerateLink(options);
      setGeneratedLink(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async () => {
    if (!onRevokeLink) return;

    setIsRevoking(true);
    setError(null);

    try {
      await onRevokeLink();
      setGeneratedLink(null);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed
    }
  };

  const resourceLabel = resourceType === 'group' ? 'Group' : 'Client';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Share {resourceLabel}</h2>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">{resourceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {generatedLink ? (
            // Link generated state
            <>
              <div className="space-y-3">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedLink.shareUrl}
                    readOnly
                    className="flex-1 bg-gray-50"
                  />
                  <Button onClick={handleCopy} variant="outline" className="shrink-0">
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {generatedLink.expiresAt && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Expires on {new Date(generatedLink.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleGenerate} variant="outline" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                {onRevokeLink && (
                  <Button
                    onClick={handleRevoke}
                    variant="destructive"
                    className="flex-1"
                    disabled={isRevoking}
                  >
                    {isRevoking ? 'Revoking...' : 'Revoke Link'}
                  </Button>
                )}
              </div>
            </>
          ) : (
            // Generate link form
            <>
              {/* Expiration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Link Expiration
                </Label>
                <select
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value as ShareOptions['expiration'])}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="never">Never</option>
                  <option value="7days">7 days</option>
                  <option value="30days">30 days</option>
                  <option value="90days">90 days</option>
                </select>
              </div>

              {/* Password Protection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Password Protection (Optional)
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                />
                <p className="text-xs text-gray-500">
                  Anyone with the link will need this password to view.
                </p>
              </div>

              {/* Access Options */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowDownload"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <Label htmlFor="allowDownload" className="flex items-center gap-2 mb-0">
                  <Eye className="h-4 w-4" />
                  Allow viewers to download reports
                </Label>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                className="w-full"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate Share Link
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;
