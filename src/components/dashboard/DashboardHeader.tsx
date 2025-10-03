import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Settings, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
  clientData: any;
  availableClients: any[];
  selectedPeriod: string;
  onClientChange: (clientId: string) => void;
  onPeriodChange: (period: string) => void;
  onExportPDF: () => void;
  isShared?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  clientData,
  availableClients,
  selectedPeriod,
  onClientChange,
  onPeriodChange,
  onExportPDF,
  isShared = false
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EA</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Event Analytics</h1>
                <p className="text-sm text-gray-500">Marketing Performance Dashboard</p>
              </div>
            </div>
          </div>

          {!isShared && (
            <div className="flex items-center gap-3">
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
              <Button onClick={onExportPDF} size="sm">
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Client Selector */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Venue
            </label>
            <Select value={clientData?.id || ''} onValueChange={onClientChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a venue..." />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-3">
                      {client.logo_url ? (
                        <img
                          src={client.logo_url}
                          alt={client.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {client.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span>{client.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selector */}
          <div className="w-48">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Time Period
            </label>
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Share Button */}
          {clientData && !isShared && (
            <div className="flex items-end">
              <Button variant="outline" size="sm" className="h-10">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
