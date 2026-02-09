/**
 * GroupList - Grid/List display of all groups
 */

import React, { useState } from 'react';
import { Plus, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { GroupCard } from './GroupCard';
import { Group } from '@/types/groups';

interface GroupListProps {
  groups: Group[];
  isLoading: boolean;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onShare: (group: Group) => void;
  onView: (group: Group) => void;
  onCreate: () => void;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  isLoading,
  onEdit,
  onDelete,
  onShare,
  onView,
  onCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'archived'>('all');

  // Filter groups based on search and status
  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get client count for a group (mock - would come from actual data)
  const getClientCount = (group: Group): number => {
    // This would ideally come from the group data
    return 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Button>
        </div>
      </div>

      {/* Groups display */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Filter className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No groups found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first group'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={onCreate} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }
        >
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              clientCount={getClientCount(group)}
              onEdit={() => onEdit(group)}
              onDelete={() => onDelete(group)}
              onShare={() => onShare(group)}
              onView={() => onView(group)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredGroups.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          Showing {filteredGroups.length} of {groups.length} group{groups.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default GroupList;
