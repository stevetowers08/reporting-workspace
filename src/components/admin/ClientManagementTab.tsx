import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/LoadingStates';
import { Client } from '@/services/admin/adminService';
import { BarChart3, Edit, FileSpreadsheet, Plus, Search, Trash2, Zap } from 'lucide-react';
import React, { useState } from 'react';

interface ClientManagementTabProps {
  clients: Client[];
  loading: boolean;
  deleting: Record<string, boolean>;
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string, clientName: string) => void;
}

export const ClientManagementTab: React.FC<ClientManagementTabProps> = ({
  clients,
  loading,
  deleting,
  onAddClient,
  onEditClient,
  onDeleteClient
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <LoadingState message="Loading venues..." />;
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Venues ({filteredClients.length})</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-7 pr-3 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <Button 
          onClick={onAddClient}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-6"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Venue
        </Button>
      </div>

      {/* Compact Client Table */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          {clients.length === 0 ? 'No venues yet' : 'No venues found'}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Platforms
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors" data-testid="client-card">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={`${client.name} logo`}
                            className="w-6 h-6 object-cover rounded border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
                            <BarChart3 className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div className="text-sm font-medium text-slate-900">{client.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(client.status)}`}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {client.accounts?.facebookAds && client.accounts.facebookAds !== 'none' && (
                          <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center" title="Facebook Ads">
                            <span className="text-white font-bold text-xs">f</span>
                          </div>
                        )}
                        {client.accounts?.googleAds && client.accounts.googleAds !== 'none' && (
                          <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center" title="Google Ads">
                            <span className="text-white font-bold text-xs">G</span>
                          </div>
                        )}
                        {client.accounts?.goHighLevel && client.accounts.goHighLevel !== 'none' && (
                          <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center" title="GoHighLevel">
                            <Zap className="h-2 w-2 text-white" />
                          </div>
                        )}
                        {client.accounts?.googleSheets && client.accounts.googleSheets !== 'none' && (
                          <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center" title="Google Sheets">
                            <FileSpreadsheet className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEditClient(client)}
                          className="h-6 w-6 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          data-testid="edit-client-btn"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClient(client.id, client.name)}
                          disabled={deleting[client.id]}
                          className="h-6 w-6 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
