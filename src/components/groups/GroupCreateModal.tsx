/**
 * GroupCreateModal - Modal for creating a new group
 */

import React, { useState } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClientSelector } from './ClientSelector';
import { CreateGroupRequest } from '@/types/groups';

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGroupRequest) => Promise<void>;
  availableClients: { id: string; name: string; logo_url?: string }[];
  isLoading?: boolean;
}

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableClients,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (name.length > 255) {
      newErrors.name = 'Group name must be less than 255 characters';
    }

    if (description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      clientIds: selectedClientIds.length > 0 ? selectedClientIds : undefined,
    });

    // Reset form
    setName('');
    setDescription('');
    setSelectedClientIds([]);
    setErrors({});
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setSelectedClientIds([]);
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create New Group</h2>
              <p className="text-sm text-gray-500">Organize multiple clients into a group</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Group Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                disabled={isLoading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this group"
                rows={3}
                disabled={isLoading}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              <p className="text-xs text-gray-500">{description.length}/1000 characters</p>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Add Clients (Optional)</Label>
              <p className="text-sm text-gray-500 mb-2">
                Select clients to include in this group. You can add more later.
              </p>
              <ClientSelector
                selectedClientIds={selectedClientIds}
                onChange={setSelectedClientIds}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Group'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupCreateModal;
