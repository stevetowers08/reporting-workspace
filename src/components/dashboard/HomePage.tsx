import { AdminHeader } from '@/components/dashboard/AdminHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingStates';
import {
    AlertCircle,
    ArrowRight,
    BarChart3,
    CheckCircle,
    Clock,
    FileSpreadsheet,
    Globe,
    Plus,
    Settings,
    Users,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface HomePageProps {
  clients: Array<{
    id: string;
    name: string;
    logo_url?: string;
    status: 'active' | 'paused' | 'inactive';
    accounts: {
      facebookAds?: string;
      googleAds?: string;
      goHighLevel?: string;
      googleSheets?: string;
    };
  }>;
  integrations: Array<{
    id: string;
    name: string;
    platform: string;
    status: 'connected' | 'not connected' | 'error';
    clientsUsing: number;
  }>;
  onClientSelect: (clientId: string) => void;
  onAddClient: () => void;
  onGoToAdmin: () => void;
  loading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  clients,
  integrations,
  onClientSelect,
  onAddClient,
  onGoToAdmin,
  loading = false
}) => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    connectedIntegrations: 0,
    totalIntegrations: 0
  });

  useEffect(() => {
    const activeClients = clients.filter(c => c.status === 'active').length;
    const connectedIntegrations = integrations.filter(i => i.status === 'connected').length;
    
    setStats({
      totalClients: clients.length,
      activeClients,
      connectedIntegrations,
      totalIntegrations: integrations.length
    });
  }, [clients, integrations]);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">f</span>
        </div>;
      case 'google':
        return <Globe className="h-6 w-6 text-red-600" />;
      case 'gohighlevel':
        return <Zap className="h-6 w-6 text-purple-600" />;
      case 'googlesheets':
        return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
      default:
        return <Settings className="h-6 w-6 text-slate-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'not connected':
        return <Clock className="h-4 w-4 text-slate-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header with Venue Dropdown */}
      <AdminHeader
        clients={clients.map(client => ({
          id: client.id,
          name: client.name,
          logo_url: client.logo_url
        }))}
        selectedClientId={null}
        onClientSelect={onClientSelect}
        onBackToDashboard={() => {}}
        onGoToAdmin={onGoToAdmin}
        onExportPDF={() => {}}
        onShare={() => {}}
        onSettings={onGoToAdmin}
        exportingPDF={false}
        isShared={false}
        showVenueSelector={true}
      />

      <div className="px-20 py-6">
        {/* Venue Selection - Moved to Top */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Select Venue Dashboard</h2>
              <p className="text-sm text-slate-600">Choose a client to view their marketing analytics</p>
            </div>
            <Button 
              onClick={onAddClient}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          </div>

          {clients.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No venues yet</h4>
                <p className="text-slate-600 mb-4 max-w-md mx-auto text-sm">
                  Get started by adding your first client venue.
                </p>
                <Button 
                  onClick={onAddClient}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Venue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01] border-slate-200"
                  onClick={() => onClientSelect(client.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {client.logo_url ? (
                        <img
                          src={client.logo_url}
                          alt={`${client.name} logo`}
                          className="w-8 h-8 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">
                          {client.name}
                        </h3>
                        <Badge className={`text-xs ${
                          client.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                          client.status === 'paused' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </Badge>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </div>
                    
                    <div className="flex items-center gap-1 mt-2">
                      {client.accounts.facebookAds && client.accounts.facebookAds !== 'none' && (
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center" title="Facebook Ads">
                          <span className="text-white font-bold text-xs">f</span>
                        </div>
                      )}
                      {client.accounts.googleAds && client.accounts.googleAds !== 'none' && (
                        <div className="w-5 h-5 bg-red-600 rounded flex items-center justify-center" title="Google Ads">
                          <span className="text-white font-bold text-xs">G</span>
                        </div>
                      )}
                      {client.accounts.goHighLevel && client.accounts.goHighLevel !== 'none' && (
                        <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center" title="GoHighLevel">
                          <Zap className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {client.accounts.googleSheets && client.accounts.googleSheets !== 'none' && (
                        <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center" title="Google Sheets">
                          <FileSpreadsheet className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
