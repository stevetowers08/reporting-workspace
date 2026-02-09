/**
 * GroupsListPage - Page for managing all groups
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { GroupList } from '@/components/groups/GroupList';
import { GroupCreateModal } from '@/components/groups/GroupCreateModal';
import { ShareLinkModal } from '@/components/groups/ShareLinkModal';
import { useGroups } from '@/hooks/useGroups';
import { useGroup } from '@/hooks/useGroup';
import { CreateGroupRequest, Group } from '@/types/groups';

const GroupsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { groups, isLoading, createGroup, deleteGroup } = useGroups();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sharingGroup, setSharingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  // For share link generation
  const tempGroupHook = useGroup(sharingGroup?.id);

  const handleCreateGroup = async (data: CreateGroupRequest) => {
    await createGroup(data);
    setIsCreateModalOpen(false);
  };

  const handleEditGroup = (group: Group) => {
    navigate(`/agency/groups/${group.id}/edit`);
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"?`)) {
      return;
    }
    setDeletingGroup(group);
    try {
      await deleteGroup(group.id);
    } finally {
      setDeletingGroup(null);
    }
  };

  const handleShareGroup = (group: Group) => {
    setSharingGroup(group);
  };

  const handleViewGroup = (group: Group) => {
    navigate(`/agency/groups/${group.id}/edit`);
  };

  const handleBack = () => {
    navigate('/agency');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Groups</h1>
                  <p className="text-sm text-gray-500">Organize and share multiple clients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GroupList
          groups={groups}
          isLoading={isLoading}
          onEdit={handleEditGroup}
          onDelete={handleDeleteGroup}
          onShare={handleShareGroup}
          onView={handleViewGroup}
          onCreate={() => setIsCreateModalOpen(true)}
        />
      </main>

      {/* Create Modal */}
      <GroupCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateGroup}
        availableClients={[]}
        isLoading={false}
      />

      {/* Share Modal */}
      {sharingGroup && (
        <ShareLinkModal
          isOpen={!!sharingGroup}
          onClose={() => setSharingGroup(null)}
          resourceType="group"
          resourceName={sharingGroup.name}
          existingShareUrl={sharingGroup.shareable_link}
          onGenerateLink={tempGroupHook.generateShareLink}
          onRevokeLink={sharingGroup.shareable_link ? tempGroupHook.revokeShareLink : undefined}
        />
      )}
    </div>
  );
};

export default GroupsListPage;
