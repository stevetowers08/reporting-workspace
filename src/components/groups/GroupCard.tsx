/**
 * GroupCard - Compact card component for displaying a group (matches client card design)
 */

import React from 'react';
import { Users, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Group } from '@/types/groups';

interface GroupCardProps {
  group: Group;
  clientCount: number;
  onEdit: () => void;
  onView: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  clientCount,
  onEdit,
  onView,
}) => {
  return (
    <Card
      className="cursor-pointer border-slate-200 relative group hover:shadow-md transition-shadow"
      onClick={onView}
    >
      <CardContent className="p-3">
        {/* Edit Button - appears on hover */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit className="h-3 w-3" />
        </Button>

        {/* Logo and Name */}
        <div className="flex items-center gap-3 mb-3">
          {group.logo_url ? (
            <img
              src={group.logo_url}
              alt={`${group.name} logo`}
              className="w-8 h-8 object-cover rounded-lg border border-slate-200"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {group.name}
            </h3>
          </div>
        </div>

        {/* Client Count */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Users className="h-3.5 w-3.5" />
          <span>
            {clientCount} {clientCount === 1 ? 'venue' : 'venues'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupCard;
