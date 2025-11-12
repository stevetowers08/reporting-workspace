import { Button } from '@/components/ui/button-simple';
import { ChevronDown, Facebook, FileDown, Settings, Share2, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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
  onBackToDashboard: _onBackToDashboard,
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (_selectedClientId && clients.length > 0) {
      const client = clients.find(c => c.id === _selectedClientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [_selectedClientId, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      // Use a small delay to ensure button clicks are processed first
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  if (isShared) {
    return null; // Don't show agency header for shared views
  }

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-sm px-4 sm:px-6 md:px-8 lg:px-10">
      <div className="py-3 sm:py-4">
        {/* Mobile Layout */}
        <div className="flex flex-col gap-3 md:hidden">
          {/* Top Row: Branding and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/logos/tulen-favicon-32x32.png"
                alt="Tulen Agency logo"
                className="w-6 h-6 object-contain"
              />
              <div>
                <h1 className="text-xs font-semibold text-white">Tulen Agency</h1>
                <p className="text-[10px] text-slate-300">Marketing Analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedClient && !isAgencyPanel && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportPDF}
                    disabled={exportingPDF}
                    className="border-white/30 text-white hover:bg-white/20 bg-white/10 px-2 py-1 h-7 text-xs"
                  >
                    <FileDown className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onShare}
                    className="border-white/30 text-white hover:bg-white/20 bg-white/10 px-2 py-1 h-7 text-xs"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={onGoToAgency}
                className="border-blue-400 text-blue-200 hover:bg-blue-600 hover:text-white bg-blue-500/20 px-2 py-1 h-7 text-xs"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Venue Selector Row */}
          {showVenueSelector && (
            <div className="w-full">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {selectedClient?.logo_url ? (
                      <img
                        src={selectedClient.logo_url}
                        alt={`${selectedClient.name} logo`}
                        className="w-5 h-5 object-cover rounded border border-white/30"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center">
                        <Users className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <span className="text-xs font-medium truncate">
                      {selectedClient ? selectedClient.name : 'Select Venue'}
                    </span>
                  </div>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-[100] max-h-60 overflow-y-auto">
                    {clients.length === 0 ? (
                      <div className="p-3 text-center text-slate-600 text-xs">
                        No venues available
                      </div>
                    ) : (
                      clients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClientSelect(client.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          {client.logo_url ? (
                            <img
                              src={client.logo_url}
                              alt={`${client.name} logo`}
                              className="w-5 h-5 object-cover rounded border border-slate-200"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center">
                              <Users className="h-2.5 w-2.5 text-slate-600" />
                            </div>
                          )}
                          <span className="text-xs font-medium text-slate-900 truncate">
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
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center gap-2">
            <img
              src="/logos/tulen-favicon-32x32.png"
              alt="Tulen Agency logo"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-sm font-semibold text-white">Tulen Agency</h1>
              <p className="text-xs text-slate-300">Marketing Analytics</p>
            </div>
          </div>

          {/* Center: Venue Selector */}
          {showVenueSelector && (
            <div className="flex-1 max-w-xs mx-8">
              <div className="relative" ref={dropdownRef}>
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
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-[100] max-h-60 overflow-y-auto">
                    {clients.length === 0 ? (
                      <div className="p-4 text-center text-slate-600 text-sm">
                        No venues available
                      </div>
                    ) : (
                      clients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClientSelect(client.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
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
            {isAgencyPanel ? (
              <>
                <Link to="/reporting">
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
                
                <Link to="/reporting">
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
