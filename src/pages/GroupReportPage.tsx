/**
 * GroupReportPage - Aggregate analytics view for a group of clients
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, BarChart3, TrendingUp, Calendar, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGroup } from '@/hooks/useGroup';
import { useClientData } from '@/hooks/useDashboardQueries';

interface ClientMetrics {
  id: string;
  name: string;
  logo_url?: string;
  totalLeads: number;
  totalSpend: number;
  conversions: number;
  ctr: number;
  status: string;
}

const GroupReportPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { group, isLoading: groupLoading } = useGroup(groupId);
  const [dateRange, setDateRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  // Collect metrics from all clients in the group
  const clientMetrics: ClientMetrics[] = React.useMemo(() => {
    if (!group?.clients) return [];
    
    return group.clients.map(client => ({
      id: client.id,
      name: client.name,
      logo_url: client.logo_url,
      status: client.status,
      // Mock metrics - in real implementation, these would come from actual data
      totalLeads: Math.floor(Math.random() * 500) + 50,
      totalSpend: Math.floor(Math.random() * 10000) + 1000,
      conversions: Math.floor(Math.random() * 100) + 10,
      ctr: Number((Math.random() * 3 + 0.5).toFixed(2)),
    }));
  }, [group?.clients]);

  // Aggregate metrics
  const aggregateMetrics = React.useMemo(() => {
    if (clientMetrics.length === 0) return null;
    
    const total = clientMetrics.reduce((acc, client) => ({
      leads: acc.leads + client.totalLeads,
      spend: acc.spend + client.totalSpend,
      conversions: acc.conversions + client.conversions,
    }), { leads: 0, spend: 0, conversions: 0 });
    
    const avgCtr = clientMetrics.reduce((acc, c) => acc + c.ctr, 0) / clientMetrics.length;
    
    return {
      ...total,
      avgCtr: Number(avgCtr.toFixed(2)),
      clientCount: clientMetrics.length,
      activeClients: clientMetrics.filter(c => c.status === 'active').length,
    };
  }, [clientMetrics]);

  const handleExportReport = async () => {
    setIsExporting(true);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsExporting(false);
    alert('Group report exported successfully!');
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading group report...</span>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Group not found</p>
          <Button onClick={() => navigate('/agency/groups')}>Back to Groups</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/agency/groups/${groupId}/edit`)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Group
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                  {group.logo_url ? (
                    <img src={group.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    group.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
                  <p className="text-sm text-gray-500">Group Report</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-10 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <Button onClick={handleExportReport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {aggregateMetrics && (
          <>
            {/* Aggregate Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Venues</p>
                      <p className="text-3xl font-bold text-gray-900">{aggregateMetrics.clientCount}</p>
                      <p className="text-sm text-green-600 mt-1">{aggregateMetrics.activeClients} active</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Leads</p>
                      <p className="text-3xl font-bold text-gray-900">{aggregateMetrics.leads.toLocaleString()}</p>
                      <p className="text-sm text-green-600 mt-1">
                        ~{Math.round(aggregateMetrics.leads / aggregateMetrics.clientCount)} per venue
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Total Spend</p>
                      <p className="text-3xl font-bold text-gray-900">${(aggregateMetrics.spend / 1000).toFixed(1)}k</p>
                      <p className="text-sm text-gray-500 mt-1">
                        ~${Math.round(aggregateMetrics.spend / aggregateMetrics.clientCount).toLocaleString()} per venue
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Avg. CTR</p>
                      <p className="text-3xl font-bold text-gray-900">{aggregateMetrics.avgCtr}%</p>
                      <p className="text-sm text-gray-500 mt-1">Across all venues</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Venue Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle>Venue Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Venue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Leads</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Spend</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Conversions</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">CTR</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clientMetrics.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                {client.logo_url ? (
                                  <img src={client.logo_url} alt="" className="w-full h-full rounded object-cover" />
                                ) : (
                                  client.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="font-medium text-gray-900">{client.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{client.totalLeads}</td>
                          <td className="px-4 py-3 text-right text-gray-600">${client.totalSpend.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{client.conversions}</td>
                          <td className="px-4 py-3 text-right">{client.ctr}%</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              client.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : client.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewClient(client.id)}
                            >
                              View Dashboard
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default GroupReportPage;
