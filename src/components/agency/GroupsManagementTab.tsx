/**
 * GroupsManagementTab - Tab for managing client groups
 */

import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/UnifiedLoadingSystem';
import { useGroups } from '@/hooks/useGroups';
import { useGroup } from '@/hooks/useGroup';
import { Group, CreateGroupRequest } from '@/types/groups';
import { FolderOpen, Plus, Search, Users, ExternalLink, Edit, Trash2, Share2, Copy, Check, BarChart3 } from 'lucide-react';
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
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleCreateGroup = async (data: CreateGroupRequest) => {
    await createGroup(data);
    setShowCreateModal(false);
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This will not delete the venues, only the group.`)) {
      return;
    }
    setDeletingGroupId(group.id);
    try {
      await deleteGroup(group.id);
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

  const handleViewGroup = (group: Group) => {
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
            New Group
          </Button>
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">
            {searchTerm ? 'No groups found' : 'No groups yet'}
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            {searchTerm 
              ? 'Try adjusting your search' 
              : 'Create groups to organize your venues together'}
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <div 
              key={group.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              {/* Group Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {group.logo_url ? (
                    <img 
                      src={group.logo_url} 
                      alt={group.name}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    group.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{group.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      group.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : group.status === 'paused'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.status}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.client_count || 0} venues
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {group.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {group.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewGroup(group)}
                  className="flex-1 h-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewGroupReport(group)}
                  className="flex-1 h-8 text-slate-600 hover:text-purple-600 hover:bg-purple-50"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Report
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSharingGroupId(group.id)}
                  className="flex-1 h-8 text-slate-600 hover:text-green-600 hover:bg-green-50"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>

                {group.shareable_link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyShareLink(group)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                    title="Copy share link"
                  >
                    {copiedGroupId === group.id ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGroup(group)}
                  disabled={deletingGroupId === group.id}
                  className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
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
