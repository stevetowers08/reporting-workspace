import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/UnifiedLoadingSystem';
import {
    BarChart3,
    Calendar,
    ExternalLink,
    Filter,
    Plus,
    Search,
    TrendingUp,
    Users,
    X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';

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
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'paused': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getPlatformIcons = (accounts: Client['accounts']) => {
    const platforms = [];
    if (accounts.facebookAds && accounts.facebookAds !== 'none') {
      platforms.push({ icon: 'f', color: 'bg-blue-100 text-blue-700', label: 'Facebook Ads' });
    }
    if (accounts.googleAds && accounts.googleAds !== 'none') {
      platforms.push({ icon: 'G', color: 'bg-red-100 text-red-700', label: 'Google Ads' });
    }
    if (accounts.goHighLevel && accounts.goHighLevel !== 'none') {
      platforms.push({ icon: 'GHL', color: 'bg-purple-100 text-purple-700', label: 'GoHighLevel' });
    }
    if (accounts.googleSheets && accounts.googleSheets !== 'none') {
      platforms.push({ icon: 'GS', color: 'bg-green-100 text-green-700', label: 'Google Sheets' });
    }
    return platforms;
  };

  if (loading) {
    return <PageLoader message="Loading clients..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Client Dashboard</h1>
                <p className="text-sm text-slate-600 mt-1">Select a client to view their marketing analytics</p>
              </div>
            </div>
            
            <Button 
              onClick={onAddClient}
              size="sm"
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm min-w-[120px] bg-white"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm min-w-[140px] bg-white"
              >
                <option value="">All Types</option>
                <option value="ecommerce">E-commerce</option>
                <option value="saas">SaaS</option>
                <option value="agency">Agency</option>
                <option value="local">Local Business</option>
              </select>
            </div>
          </div>
          
          {/* Results count */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
            </span>
            {(searchTerm || statusFilter || typeFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setTypeFilter('');
                }}
                className="text-sm text-slate-500"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {clients.length === 0 ? 'No clients yet' : 'No clients found'}
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {clients.length === 0 
                ? 'Get started by adding your first client to begin tracking their marketing performance.'
                : 'Try adjusting your search criteria or filters to find what you\'re looking for.'
              }
            </p>
            {clients.length === 0 && (
              <Button 
                onClick={onAddClient}
                size="lg"
                className="h-11"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredClients.map((client) => {
              const platforms = getPlatformIcons(client.accounts);
              
              return (
                <Card 
                  key={client.id} 
                  className="cursor-pointer group"
                  onClick={() => onClientSelect(client.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {client.logo_url ? (
                          <img
                            src={client.logo_url}
                            alt={`${client.name} logo`}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                            <BarChart3 className="h-5 w-5 text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-semibold text-slate-900 truncate">
                            {client.name}
                          </CardTitle>
                          <p className="text-sm text-slate-600 truncate">{client.type}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusColor(client.status)}`}>
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
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${platform.color}`}
                            title={platform.label}
                          >
                            {platform.icon}
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
                        <span className="truncate">Last activity: {client.lastActivity}</span>
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <Button 
                      className="w-full h-9 text-sm"
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
