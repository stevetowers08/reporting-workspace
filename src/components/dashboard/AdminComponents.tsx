import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    BarChart3,
    CheckCircle,
    Clock,
    Edit,
    ExternalLink,
    FileSpreadsheet,
    Globe,
    Settings,
    Shield,
    Trash2,
    Users,
    Zap
} from 'lucide-react';
import React from 'react';

interface AgencyHeaderProps {
  onBackToDashboard: () => void;
}

export const AgencyHeader: React.FC<AgencyHeaderProps> = ({ onBackToDashboard }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBackToDashboard}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Agency Panel</h1>
                <p className="text-sm text-slate-600">Manage clients and integrations</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
              <Shield className="h-3 w-3 mr-1" />
              Agency Access
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
};

interface IntegrationCardProps {
  integration: {
    id: string;
    name: string;
    platform: string;
    status: 'connected' | 'not connected' | 'error';
    lastSync: string;
    clientsUsing: number;
    accountName?: string;
  };
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConnect,
  onDisconnect,
  connecting
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'not connected':
        return <Clock className="h-5 w-5 text-slate-400" />;
      default:
        return <Clock className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'not connected':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

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

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              {getPlatformIcon(integration.platform)}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">
                {integration.name}
              </CardTitle>
              {integration.accountName && (
                <p className="text-sm text-slate-600">{integration.accountName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(integration.status)}
            <Badge className={getStatusColor(integration.status)}>
              {integration.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="h-4 w-4" />
              <span>{integration.clientsUsing} clients using</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Activity className="h-4 w-4" />
              <span>Last sync: {integration.lastSync}</span>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex gap-2">
            {integration.status === 'connected' ? (
              <Button
                onClick={onDisconnect}
                variant="outline"
                size="sm"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={onConnect}
                disabled={connecting}
                size="sm"
                className={`flex-1 ${
                  integration.platform === 'facebook' ? 'bg-blue-600 hover:bg-blue-700' :
                  integration.platform === 'google' ? 'bg-green-600 hover:bg-green-700' :
                  integration.platform === 'gohighlevel' ? 'bg-purple-600 hover:bg-purple-700' :
                  'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            )}
            
            {integration.status === 'connected' && (
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface ClientTableProps {
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
  onEditClient: (client: any) => void;
  onDeleteClient: (clientId: string, clientName: string) => void;
  deleting: Record<string, boolean>;
}

export const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  onEditClient,
  onDeleteClient,
  deleting
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Platforms
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={`${client.name} logo`}
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{client.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {client.accounts.facebookAds && client.accounts.facebookAds !== 'none' && (
                      <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center" title="Facebook Ads">
                        <span className="text-white font-bold text-xs">f</span>
                      </div>
                    )}
                    {client.accounts.googleAds && client.accounts.googleAds !== 'none' && (
                      <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center" title="Google Ads">
                        <span className="text-white font-bold text-xs">G</span>
                      </div>
                    )}
                    {client.accounts.goHighLevel && client.accounts.goHighLevel !== 'none' && (
                      <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center" title="GoHighLevel">
                        <Zap className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {client.accounts.googleSheets && client.accounts.googleSheets !== 'none' && (
                      <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center" title="Google Sheets">
                        <FileSpreadsheet className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEditClient(client)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteClient(client.id, client.name)}
                      disabled={deleting[client.id]}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
