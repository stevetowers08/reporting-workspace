import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingStates';
import {
    BarChart3,
    Calendar,
    ExternalLink,
    FileSpreadsheet,
    Plus,
    Search,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface Client {
  id: string;
  name: string;
  logo_url?: string;
  type: string;
  status: 'active' | 'paused' | 'inactive';
  lastActivity?: string;
  accounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
  };
}

interface ClientSelectionPageProps {
  clients: Client[];
  onClientSelect: (clientId: string) => void;
  onAddClient: () => void;
  loading?: boolean;
}

export const ClientSelectionPage: React.FC<ClientSelectionPageProps> = ({
  clients,
  onClientSelect,
  onAddClient,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || client.status === statusFilter;
      const matchesType = !typeFilter || client.type.toLowerCase().includes(typeFilter.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [clients, searchTerm, statusFilter, typeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPlatformIcons = (accounts: Client['accounts']) => {
    const platforms = [];
    if (accounts.facebookAds && accounts.facebookAds !== 'none') {
      platforms.push({ icon: 'f', color: 'bg-blue-600', label: 'Facebook Ads' });
    }
    if (accounts.googleAds && accounts.googleAds !== 'none') {
      platforms.push({ icon: 'G', color: 'bg-red-600', label: 'Google Ads' });
    }
    if (accounts.goHighLevel && accounts.goHighLevel !== 'none') {
      platforms.push({ icon: Zap, color: 'bg-purple-600', label: 'GoHighLevel' });
    }
    if (accounts.googleSheets && accounts.googleSheets !== 'none') {
      platforms.push({ icon: FileSpreadsheet, color: 'bg-green-600', label: 'Google Sheets' });
    }
    return platforms;
  };

  if (loading) {
    return <LoadingState message="Loading clients..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Internal Admin Header */}
      <div className="bg-slate-800 text-white border-b border-slate-700">
        <div className="px-20 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Client Management</h1>
                  <p className="text-sm text-slate-400">Internal Admin Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={onAddClient}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Client
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-20 py-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Select Client Dashboard</h2>
            <p className="text-slate-600 mt-1">Choose a client to view their marketing analytics and performance data</p>
          </div>
        </div>
      </div>

      <div className="px-20 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients by name or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[140px]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[140px]"
              >
                <option value="">All Types</option>
                <option value="ecommerce">E-commerce</option>
                <option value="saas">SaaS</option>
                <option value="agency">Agency</option>
                <option value="local">Local Business</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {clients.length === 0 ? 'No clients yet' : 'No clients found'}
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {clients.length === 0 
                ? 'Get started by adding your first client to begin tracking their advertising performance.'
                : 'Try adjusting your search criteria or filters to find what you\'re looking for.'
              }
            </p>
            {clients.length === 0 && (
              <Button 
                onClick={onAddClient}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => {
              const platforms = getPlatformIcons(client.accounts);
              
              return (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-slate-200"
                  onClick={() => onClientSelect(client.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={`${client.name} logo`}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-900">
                            {client.name}
                          </CardTitle>
                          <p className="text-sm text-slate-600">{client.type}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Platform Indicators */}
                    <div className="flex items-center gap-2 mb-4">
                      {platforms.length > 0 ? (
                        platforms.map((platform, index) => (
                          <div
                            key={index}
                            className={`w-6 h-6 rounded flex items-center justify-center ${platform.color}`}
                            title={platform.label}
                          >
                            {typeof platform.icon === 'string' ? (
                              <span className="text-white font-bold text-xs">{platform.icon}</span>
                            ) : (
                              <platform.icon className="h-3 w-3 text-white" />
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No platforms connected</span>
                      )}
                    </div>
                    
                    {/* Last Activity */}
                    {client.lastActivity && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>Last activity: {client.lastActivity}</span>
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClientSelect(client.id);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      View Dashboard
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
