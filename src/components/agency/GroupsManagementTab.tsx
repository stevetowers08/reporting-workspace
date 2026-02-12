/**
 * GroupsManagementTab - Tab for managing client groups (matches venue management tab design)
 */

import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/UnifiedLoadingSystem';
import { useGroups } from '@/hooks/useGroups';
import { useGroup } from '@/hooks/useGroup';
import { Group, CreateGroupRequest } from '@/types/groups';
import { FolderOpen, Plus, Search, Users, Edit, Trash2, Share2, Copy, BarChart3 } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupCreateModal } from '@/components/groups/GroupCreateModal';
import { ShareLinkModal } from '@/components/groups/ShareLinkModal';

interface GroupsManagementTabProps {
  onViewGroup?: (group: Group) => void;
}

export const GroupsManagementTab: React.FC<GroupsManagementTabProps> = ({
  onViewGroup
}) => {
  const navigate = useNavigate();
  const { groups, isLoading, createGroup, deleteGroup } = useGroups();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sharingGroupId, setSharingGroupId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Hook for sharing functionality - fetches group with clients
  const { group: sharingGroup } = useGroup(sharingGroupId);

  const filteredGroups = groups
    .filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleCreateGroup = async (data: CreateGroupRequest) => {
    await createGroup(data);
    setShowCreateModal(false);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${groupName}"? This will not delete the venues, only the group.`)) {
      return;
    }
    setDeletingGroupId(groupId);
    try {
      await deleteGroup(groupId);
    } finally {
      setDeletingGroupId(null);
    }
  };

  const handleCopyShareLink = async (group: Group) => {
    const shareUrl = group.shareable_link
      ? `${window.location.origin}/share/g/${group.shareable_link}`
      : null;

    if (!shareUrl) {
      alert('No share link available. Generate one first.');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedGroupId(group.id);
      setTimeout(() => setCopiedGroupId(null), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
    }
  };

  const handleEditGroup = (group: Group) => {
    if (onViewGroup) {
      onViewGroup(group);
    } else {
      navigate(`/agency/groups/${group.id}/edit`);
    }
  };

  const handleViewGroupReport = (group: Group) => {
    navigate(`/agency/groups/${group.id}/report`);
  };

  if (isLoading) {
    return <PageLoader message="Loading groups..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        {/* Search and Add Group */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-60 pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="h-8 bg-blue-600 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Group
          </Button>
        </div>
      </div>

      {/* Groups Table */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {groups.length === 0 ? 'No groups yet' : 'No groups found'}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Group</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Venues</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Share Link</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date Added</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {group.logo_url ? (
                          <img
                            src={group.logo_url}
                            alt={`${group.name} logo`}
                            className="w-8 h-8 object-cover rounded-lg border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                            <FolderOpen className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className="text-sm font-medium text-slate-900">{group.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">{group.client_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {group.shareable_link ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyShareLink(group)}
                          className="h-7 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Copy Share Link"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          {copiedGroupId === group.id ? 'Copied!' : 'Copy'}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewGroupReport(group)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-purple-600 hover:bg-purple-50"
                          title="View Report"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSharingGroupId(group.id)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-green-600 hover:bg-green-50"
                          title="Share Group"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Edit Group"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          disabled={deletingGroupId === group.id}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete Group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium text-slate-600">
                        {group.created_at
                          ? new Date(group.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <GroupCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateGroup}
        availableClients={[]}
        isLoading={false}
      />

      {/* Share Modal */}
      {sharingGroup && (
        <ShareLinkModal
          isOpen={!!sharingGroup}
          onClose={() => setSharingGroupId(null)}
          group={sharingGroup}
        />
      )}
    </div>
  );
};

export default GroupsManagementTab;
