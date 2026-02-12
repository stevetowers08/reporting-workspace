/**
 * GroupList - Compact grid display of all groups (matches client list design)
 */

import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GroupCard } from './GroupCard';
import { Group } from '@/types/groups';

interface GroupListProps {
  groups: Group[];
  isLoading: boolean;
  onEdit: (group: Group) => void;
  onView: (group: Group) => void;
  onCreate: () => void;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  isLoading,
  onEdit,
  onView,
  onCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter groups based on search
  const filteredGroups = groups.filter((group) => {
    return group.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get client count for a group
  const getClientCount = (group: Group): number => {
    return group.client_count || 0;
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Select Group</h2>
          <p className="text-sm text-slate-600">Organize and manage multiple venues together</p>
        </div>
        <Button
          onClick={onCreate}
          size="sm"
          className="h-8 bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Group
        </Button>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">No groups yet</h4>
            <p className="text-slate-600 mb-4 max-w-md mx-auto text-sm">
              Get started by creating your first group to organize multiple venues.
            </p>
            <Button
              onClick={onCreate}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-4">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              clientCount={getClientCount(group)}
              onEdit={() => onEdit(group)}
              onView={() => onView(group)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupList;
