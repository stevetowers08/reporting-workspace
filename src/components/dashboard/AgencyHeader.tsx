import { Button } from '@/components/ui/button-simple';
import { BarChart3, ChevronDown, Facebook, FileDown, Settings, Share2, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  logo_url?: string;
}

interface AgencyHeaderProps {
  clients: Client[];
  selectedClientId?: string;
  onClientSelect: (clientId: string) => void;
  onBackToDashboard: () => void;
  onGoToAgency: () => void;
  onExportPDF: () => void;
  onShare: () => void;
  exportingPDF: boolean;
  isShared?: boolean;
  showVenueSelector?: boolean;
  isAgencyPanel?: boolean;
}

export const AgencyHeader: React.FC<AgencyHeaderProps> = ({
  clients,
  selectedClientId: _selectedClientId,
  onClientSelect,
  onBackToDashboard,
  onGoToAgency,
  onExportPDF,
  onShare,
  exportingPDF,
  isShared = false,
  showVenueSelector = true,
  isAgencyPanel = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    if (_selectedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === _selectedClientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [_selectedClientId, clients]);

  if (isShared) {
    return null; // Don't show agency header for shared views
  }

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-sm px-20">
      <div className="py-4">
        <div className="flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Marketing Analytics</h1>
              <p className="text-xs text-slate-300">Agency Dashboard</p>
            </div>
          </div>

          {/* Center: Venue Selector */}
          {showVenueSelector && (
            <div className="flex-1 max-w-xs mx-8">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {selectedClient?.logo_url ? (
                      <img
                        src={selectedClient.logo_url}
                        alt={`${selectedClient.name} logo`}
                        className="w-6 h-6 object-cover rounded border border-white/30"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-slate-600 rounded flex items-center justify-center">
                        <Users className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-medium truncate">
                      {selectedClient ? selectedClient.name : 'Select Venue'}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {clients.length === 0 ? (
                      <div className="p-4 text-center text-slate-600 text-sm">
                        No venues available
                      </div>
                    ) : (
                      clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            onClientSelect(client.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt={`${client.name} logo`}
                              className="w-6 h-6 object-cover rounded border border-slate-200"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center">
                              <Users className="h-3 w-3 text-slate-600" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {client.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Agency Actions */}
          <div className="flex items-center gap-2">
            {/* Show Back to Dashboard button for agency panel */}
            {isAgencyPanel ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToDashboard}
                  className="border-white/30 text-white hover:bg-white/20 hover:text-white hover:border-white/50 bg-white/10"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                
                <Link to="/facebook-ads-reporting">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-400 text-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-400 bg-blue-500/20"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    All Accounts
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Only show Export/Share when a venue is selected */}
                {selectedClient && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onExportPDF}
                      disabled={exportingPDF}
                      className="border-white/30 text-white hover:bg-white/20 hover:text-white hover:border-white/50 bg-white/10"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      {exportingPDF ? 'Exporting...' : 'Export'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onShare}
                      className="border-white/30 text-white hover:bg-white/20 hover:text-white hover:border-white/50 bg-white/10"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Link
                    </Button>
                  </>
                )}
                
                <Link to="/facebook-ads-reporting">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-400 text-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-400 bg-blue-500/20"
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    All Accounts
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onGoToAgency}
                  className="border-blue-400 text-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-400 bg-blue-500/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Agency
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
