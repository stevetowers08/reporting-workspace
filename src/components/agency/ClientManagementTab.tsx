import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/LoadingStates';
import { LogoManager } from '@/components/ui/LogoManager';
import { Client } from '@/services/agency/agencyService';
import { BarChart3, Edit, Plus, Search, Trash2 } from 'lucide-react';
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
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'paused': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return <LoadingState message="Loading venues..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Venues</h2>
            <p className="text-sm text-slate-600 mt-1">Manage client venues and their connected platforms</p>
          </div>
          <Button 
            onClick={onAddClient}
            size="sm"
            className="h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Venue
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search venues"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-60 pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{filteredClients.length} result{filteredClients.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Clients Table */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {clients.length === 0 ? 'No venues yet' : 'No venues found'}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Venue</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Platforms</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors" data-testid="client-card">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={`${client.name} logo`}
                            className="w-8 h-8 object-cover rounded border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                            <BarChart3 className="h-4 w-4 text-slate-500" />
                          </div>
                        )}
                        <div className="text-sm font-medium text-slate-900">{client.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusColor(client.status)}`}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {client.accounts?.facebookAds && client.accounts.facebookAds !== 'none' && (
                          <LogoManager 
                            platform="meta" 
                            size={18} 
                            context="client-table"
                            className="text-slate-600"
                            title="Facebook Ads"
                          />
                        )}
                        {client.accounts?.googleAds && client.accounts.googleAds !== 'none' && (
                          <LogoManager 
                            platform="googleAds" 
                            size={18} 
                            context="client-table"
                            className="text-slate-600"
                            title="Google Ads"
                          />
                        )}
                        {client.accounts?.goHighLevel && client.accounts.goHighLevel !== 'none' && (
                          <LogoManager 
                            platform="goHighLevel" 
                            size={18} 
                            context="client-table"
                            className="text-slate-600"
                            title="GoHighLevel"
                          />
                        )}
                        {client.accounts?.googleSheets && client.accounts.googleSheets !== 'none' && (
                          <LogoManager 
                            platform="googleSheets" 
                            size={18} 
                            context="client-table"
                            className="text-slate-600"
                            title="Google Sheets"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEditClient(client)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          data-testid="edit-client-btn"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClient(client.id, client.name)}
                          disabled={deleting[client.id]}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
