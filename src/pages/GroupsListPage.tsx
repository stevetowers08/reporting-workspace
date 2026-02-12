/**
 * GroupsListPage - Page for managing all groups (matches app design)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupList } from '@/components/groups/GroupList';
import { GroupCreateModal } from '@/components/groups/GroupCreateModal';
import { useGroups } from '@/hooks/useGroups';
import { CreateGroupRequest, Group } from '@/types/groups';

const GroupsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { groups, isLoading, createGroup } = useGroups();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateGroup = async (data: CreateGroupRequest) => {
    await createGroup(data);
    setIsCreateModalOpen(false);
  };

  const handleEditGroup = (group: Group) => {
    navigate(`/agency/groups/${group.id}/edit`);
  };

  const handleViewGroup = (group: Group) => {
    navigate(`/agency/groups/${group.id}/edit`);
  };

  const handleBack = () => {
    navigate('/agency');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple Header Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14">
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-slate-600">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Agency
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GroupList
          groups={groups}
          isLoading={isLoading}
          onEdit={handleEditGroup}
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
    </div>
  );
};

export default GroupsListPage;
