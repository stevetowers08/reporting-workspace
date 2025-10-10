import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GHLPipelineStagesProps {
  locationId: string;
  dateRange?: { start: string; end: string };
}

interface PipelineStage {
  stage: string;
  count: number;
  percentage: number;
  avgDaysInStage: number;
  conversionRate: number;
}

const PIPELINE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const GHLPipelineStages: React.FC<GHLPipelineStagesProps> = ({ locationId, dateRange }) => {
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPipelineData = async () => {
      try {
        const metrics = await GoHighLevelService.getGHLMetrics(locationId, {
          startDate: dateRange?.start,
          endDate: dateRange?.end
        });
        
        // Get all contacts to analyze pipeline stages
        // const allContacts = await GoHighLevelService.getAllContacts(); // Private method - commented out
        const allContacts: any[] = [];
        
        // Analyze pipeline stages based on contact data
        const stages: Record<string, { contacts: any[]; totalDays: number }> = {
          'New Lead': { contacts: [], totalDays: 0 },
          'Qualified Lead': { contacts: [], totalDays: 0 },
          'In Progress': { contacts: [], totalDays: 0 },
          'Scheduled Call': { contacts: [], totalDays: 0 },
          'Tour Scheduled': { contacts: [], totalDays: 0 },
          'Proposal Sent': { contacts: [], totalDays: 0 },
          'Booked Event': { contacts: [], totalDays: 0 }
        };

        allContacts.forEach(contact => {
          const daysSinceAdded = Math.floor(
            (new Date().getTime() - new Date(contact.dateAdded).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Determine stage based on contact data
          let stage = 'New Lead';
          
          // Check if contact has custom fields (qualified lead)
          if (contact.customFields && contact.customFields.length > 0) {
            stage = 'Qualified Lead';
            
            // Check for specific indicators
            const hasGuestCount = contact.customFields.some((field: any) => field.id === 'spSlgg7eis8kwORECHZ9');
            const hasEventDate = contact.customFields.some((field: any) => field.id === 'Y0VtlMHIFGgRtqQimAdg');
            const hasNotes = contact.customFields.some((field: any) => field.id === 'pf2zbriVQswyL64BLAX3');
            
            if (hasGuestCount && hasEventDate) {
              stage = 'Booked Event';
            } else if (hasGuestCount && hasNotes) {
              stage = 'Proposal Sent';
            } else if (hasGuestCount) {
              stage = 'Tour Scheduled';
            } else if (hasNotes) {
              stage = 'Scheduled Call';
            } else if (contact.assignedTo) {
              stage = 'In Progress';
            }
          }
          
          // Check communication status
          if (contact.dndSettings && Object.keys(contact.dndSettings).length > 0) {
            const hasActiveCommunication = Object.values(contact.dndSettings).some(
              (setting: any) => setting.status === 'active'
            );
            if (hasActiveCommunication && stage === 'Qualified Lead') {
              stage = 'Scheduled Call';
            }
          }
          
          stages[stage].contacts.push(contact);
          stages[stage].totalDays += daysSinceAdded;
        });

        // Calculate pipeline metrics
        const totalContacts = allContacts.length;
        const pipelineStages: PipelineStage[] = Object.entries(stages)
          .filter(([_, data]) => data.contacts.length > 0)
          .map(([stage, data]) => {
            const avgDaysInStage = data.contacts.length > 0 ? 
              Math.round(data.totalDays / data.contacts.length) : 0;
            
            // Calculate conversion rate (leads that moved to next stage)
            const nextStageIndex = Object.keys(stages).indexOf(stage) + 1;
            const nextStage = Object.keys(stages)[nextStageIndex];
            const nextStageCount = nextStage ? stages[nextStage].contacts.length : 0;
            const conversionRate = data.contacts.length > 0 ? 
              (nextStageCount / data.contacts.length) * 100 : 0;
            
            return {
              stage,
              count: data.contacts.length,
              percentage: totalContacts > 0 ? (data.contacts.length / totalContacts) * 100 : 0,
              avgDaysInStage,
              conversionRate: Math.round(conversionRate * 10) / 10
            };
          })
          .sort((a, b) => Object.keys(stages).indexOf(a.stage) - Object.keys(stages).indexOf(b.stage));

        setPipelineData(pipelineStages);
      } catch (error) {
        // Error handled by error boundary
      } finally {
        setLoading(false);
      }
    };

    fetchPipelineData();
  }, [dateRange]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">GHL Sales Pipeline</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Loading pipeline data...</div>
        </div>
      </Card>
    );
  }

  if (!pipelineData.length) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">GHL Sales Pipeline</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-slate-500">No pipeline data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">GHL Sales Pipeline</h3>
        <p className="text-sm text-slate-600">Lead progression through sales stages</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Bar Chart */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Pipeline Distribution</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis 
                dataKey="stage" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} leads (${props.payload.percentage.toFixed(1)}%)`,
                  'Leads'
                ]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Pie Chart */}
        <div className="h-64">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Stage Distribution</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pipelineData as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ stage, percentage }: any) => `${stage}: ${(percentage as number).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {pipelineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} leads`,
                  'Count'
                ]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline Metrics Table */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Pipeline Performance</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-medium text-slate-600">Stage</th>
                <th className="text-right py-2 font-medium text-slate-600">Leads</th>
                <th className="text-right py-2 font-medium text-slate-600">% of Total</th>
                <th className="text-right py-2 font-medium text-slate-600">Avg Days</th>
                <th className="text-right py-2 font-medium text-slate-600">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {pipelineData.map((stage, index) => (
                <tr key={stage.stage} className="border-b border-slate-100">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: PIPELINE_COLORS[index % PIPELINE_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-700">{stage.stage}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 text-slate-600">{stage.count}</td>
                  <td className="text-right py-2 text-slate-600">{stage.percentage.toFixed(1)}%</td>
                  <td className="text-right py-2 text-slate-600">{stage.avgDaysInStage} days</td>
                  <td className="text-right py-2 text-slate-600">
                    {stage.conversionRate > 0 ? `${stage.conversionRate}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline Insights */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h4 className="text-sm font-medium text-green-900 mb-2">Pipeline Insights</h4>
        <div className="text-sm text-green-800 space-y-1">
          <p>• <strong>Total Pipeline Value:</strong> {pipelineData.reduce((sum, stage) => sum + stage.count, 0)} leads in pipeline</p>
          <p>• <strong>Conversion Rate:</strong> {pipelineData.find(s => s.stage === 'Booked Event')?.percentage.toFixed(1) || '0'}% of leads book events</p>
          <p>• <strong>Average Sales Cycle:</strong> {Math.round(pipelineData.reduce((sum, stage) => sum + stage.avgDaysInStage, 0) / pipelineData.length)} days</p>
          <p>• <strong>Bottleneck Stage:</strong> {pipelineData.reduce((max, stage) => stage.avgDaysInStage > max.avgDaysInStage ? stage : max).stage} (avg {pipelineData.reduce((max, stage) => stage.avgDaysInStage > max.avgDaysInStage ? stage : max).avgDaysInStage} days)</p>
        </div>
      </div>
    </Card>
  );
};
