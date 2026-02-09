/**
 * GroupBadge - Shows group context in client dashboard header
 */

import React from 'react';
import { FolderOpen, ChevronRight, X } from 'lucide-react';
import { Group } from '@/types/groups';

interface GroupBadgeProps {
  group: Group;
  onClose?: () => void;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'shared';
}

export const GroupBadge: React.FC<GroupBadgeProps> = ({
  group,
  onClose,
  onClick,
  variant = 'default'
}) => {
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors"
      >
        <FolderOpen className="h-3 w-3" />
        <span className="truncate max-w-[100px]">{group.name}</span>
      </button>
    );
  }

  if (variant === 'shared') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <FolderOpen className="h-4 w-4 text-blue-500" />
        <span>Part of</span>
        <button
          onClick={onClick}
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          {group.name}
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
      <FolderOpen className="h-4 w-4 text-blue-600" />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Group</span>
        <button
          onClick={onClick}
          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
        >
          {group.name}
        </button>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-1 p-0.5 hover:bg-white rounded-full transition-colors"
        >
          <X className="h-3.5 w-3.5 text-gray-400" />
        </button>
      )}
    </div>
  );
};

interface GroupBreadcrumbProps {
  groups: Group[];
  onGroupClick?: (group: Group) => void;
  className?: string;
}

export const GroupBreadcrumb: React.FC<GroupBreadcrumbProps> = ({
  groups,
  onGroupClick,
  className = ''
}) => {
  if (groups.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <FolderOpen className="h-4 w-4 text-blue-500" />
      <span className="text-gray-500">In groups:</span>
      <div className="flex items-center gap-1">
        {groups.map((group, index) => (
          <React.Fragment key={group.id}>
            {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            <button
              onClick={() => onGroupClick?.(group)}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors font-medium"
            >
              {group.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default GroupBadge;
