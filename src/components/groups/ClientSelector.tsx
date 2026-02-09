/**
 * ClientSelector - Multi-select component for choosing clients
 */

import React, { useState, useMemo } from 'react';
import { Search, Check, X, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAvailableClients } from '@/hooks/useDashboardQueries';

interface ClientSelectorProps {
  selectedClientIds: string[];
  onChange: (clientIds: string[]) => void;
  excludeClientIds?: string[];
  disabled?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  selectedClientIds,
  onChange,
  excludeClientIds = [],
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: availableClients = [], isLoading } = useAvailableClients();

  // Filter out excluded clients and apply search
  const filteredClients = useMemo(() => {
    return availableClients
      .filter((client) => !excludeClientIds.includes(client.id))
      .filter(
        (client) =>
          client.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [availableClients, excludeClientIds, searchQuery]);

  // Get selected client objects
  const selectedClients = useMemo(() => {
    return availableClients.filter((client) => selectedClientIds.includes(client.id));
  }, [availableClients, selectedClientIds]);

  const toggleClient = (clientId: string) => {
    if (disabled) return;

    if (selectedClientIds.includes(clientId)) {
      onChange(selectedClientIds.filter((id) => id !== clientId));
    } else {
      onChange([...selectedClientIds, clientId]);
    }
  };

  const removeClient = (clientId: string) => {
    if (disabled) return;
    onChange(selectedClientIds.filter((id) => id !== clientId));
  };

  const selectAll = () => {
    if (disabled) return;
    const allFilteredIds = filteredClients.map((c) => c.id);
    const newSelection = [...new Set([...selectedClientIds, ...allFilteredIds])];
    onChange(newSelection);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Search and selected count */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              disabled={disabled}
              className="pl-9 h-9"
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {selectedClientIds.length} selected
          </span>
        </div>
      </div>

      {/* Selected clients chips */}
      {selectedClients.length > 0 && (
        <div className="p-3 border-b bg-white">
          <div className="flex flex-wrap gap-2">
            {selectedClients.map((client) => (
              <span
                key={client.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {client.logo_url ? (
                  <img
                    src={client.logo_url}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                <span className="truncate max-w-[150px]">{client.name}</span>
                {!disabled && (
                  <button
                    onClick={() => removeClient(client.id)}
                    className="hover:text-blue-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Client list */}
      <div className="max-h-64 overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No clients match your search' : 'No available clients'}
          </div>
        ) : (
          <>
            {/* Select/Clear all actions */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <button
                onClick={selectAll}
                disabled={disabled}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Select all visible
              </button>
              {selectedClientIds.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={disabled}
                  className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-50"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Client items */}
            {filteredClients.map((client) => {
              const isSelected = selectedClientIds.includes(client.id);
              return (
                <button
                  key={client.id}
                  onClick={() => toggleClient(client.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${
                    isSelected ? 'bg-blue-50' : ''
                  } disabled:opacity-50`}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>

                  <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt=""
                        className="w-full h-full rounded object-cover"
                      />
                    ) : (
                      client.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <span className="flex-1 truncate">{client.name}</span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default ClientSelector;
