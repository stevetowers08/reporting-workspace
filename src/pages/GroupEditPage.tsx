/**
 * GroupEditPage - Page for editing a group and managing its clients
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Users, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientSelector } from '@/components/groups/ClientSelector';
import { ShareLinkModal } from '@/components/groups/ShareLinkModal';
import { useGroup } from '@/hooks/useGroup';
import { useAvailableClients } from '@/hooks/useDashboardQueries';

const GroupEditPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const {
    group,
    isLoading,
    error,
    addClients,
    removeClient,
    reorderClients,
    generateShareLink,
    revokeShareLink,
    update,
  } = useGroup(groupId);
  const { data: availableClients = [] } = useAvailableClients();

  const [isAddingClients, setIsAddingClients] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');

  // Update form when group loads
  React.useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
    }
  }, [group]);

  const handleSave = async () => {
    if (!groupId) return;
    setIsSaving(true);
    try {
      await update({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClients = async () => {
    if (selectedClientIds.length === 0) return;
    await addClients(selectedClientIds);
    setSelectedClientIds([]);
    setIsAddingClients(false);
  };

  const handleRemoveClient = async (clientId: string) => {
    if (!window.confirm('Remove this client from the group?')) return;
    await removeClient(clientId);
  };

  const handleReorder = async (clientId: string, direction: 'up' | 'down') => {
    if (!group?.clients) return;

    const currentIndex = group.clients.findIndex((c) => c.id === clientId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= group.clients.length) return;

    // Create new order array
    const newClients = [...group.clients];
    const [moved] = newClients.splice(currentIndex, 1);
    newClients.splice(newIndex, 0, moved);

    // Update display orders
    const orders = newClients.map((c, index) => ({
      clientId: c.id,
      order: index,
    }));

    await reorderClients(orders);
  };

  const handleBack = () => {
    navigate('/agency/groups');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading group...</span>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load group</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Get clients already in the group
  const clientIdsInGroup = group.clients?.map((c) => c.id) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Groups
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
                  <p className="text-sm text-gray-500">
                    {group.client_count} {group.client_count === 1 ? 'client' : 'clients'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsShareModalOpen(true)}>
                Share Group
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Group details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Group Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    value={group.status}
                    onChange={(e) => update({ status: e.target.value as typeof group.status })}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Client management */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Clients in Group</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsAddingClients(true)}
                  disabled={isAddingClients}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Clients
                </Button>
              </CardHeader>
              <CardContent>
                {isAddingClients && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      Select clients to add
                    </h3>
                    <ClientSelector
                      selectedClientIds={selectedClientIds}
                      onChange={setSelectedClientIds}
                      excludeClientIds={clientIdsInGroup}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingClients(false);
                          setSelectedClientIds([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddClients}
                        disabled={selectedClientIds.length === 0}
                      >
                        Add {selectedClientIds.length} Client
                        {selectedClientIds.length !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  </div>
                )}

                {group.clients?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-2">No clients in this group yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingClients(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Client
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {group.clients?.map((client, index) => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="text-gray-400">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt=""
                              className="w-full h-full rounded object-cover"
                            />
                          ) : (
                            client.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.status}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(client.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(client.id, 'down')}
                            disabled={index === (group.clients?.length || 0) - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveClient(client.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {group && (
        <ShareLinkModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          group={group}
        />
      )}
    </div>
  );
};

export default GroupEditPage;
