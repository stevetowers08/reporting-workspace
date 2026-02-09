/**
 * GroupCard - Card component for displaying a group
 */

import React from 'react';
import { Users, Share2, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Group } from '@/types/groups';

interface GroupCardProps {
  group: Group;
  clientCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onView: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  clientCount,
  onEdit,
  onDelete,
  onShare,
  onView,
}) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Group Logo */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {group.logo_url ? (
                <img
                  src={group.logo_url}
                  alt={group.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                group.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate" title={group.name}>
                {group.name}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusColors[group.status]
                }`}
              >
                {group.status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              title="Edit Group"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="h-8 w-8 p-0 text-gray-600 hover:text-green-600 hover:bg-green-50"
              title="Share Group"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
              title="Delete Group"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {group.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{group.description}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {clientCount} {clientCount === 1 ? 'client' : 'clients'}
            </span>
          </div>
          {group.shareable_link && (
            <div className="flex items-center gap-1.5 text-blue-600">
              <Share2 className="h-4 w-4" />
              <span>Shared</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="outline" size="sm" className="w-full" onClick={onView}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View Group
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GroupCard;
