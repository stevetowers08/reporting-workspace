/**
 * SharedGroupView - Public-facing view for a shared group with venue selector
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Lock,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { getSharedGroupData, verifySharePassword } from '@/services/data/groupService';
import { SharedGroupData } from '@/types/groups';

// Lazy load the dashboard
const EventDashboard = lazy(() => import('./EventDashboard'));

const SharedGroupView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<SharedGroupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    loadGroupData();
  }, [token]);

  // Set initial selected client when data loads
  useEffect(() => {
    if (data && data.clients.length > 0 && !selectedClientId) {
      // Check URL params for client selection
      const clientIdFromParams = searchParams.get('client');
      if (clientIdFromParams && data.clients.some(c => c.id === clientIdFromParams)) {
        setSelectedClientId(clientIdFromParams);
      } else {
        // Default to first client
        setSelectedClientId(data.clients[0].id);
      }
    }
  }, [data, selectedClientId, searchParams]);

  const loadGroupData = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getSharedGroupData(token);

      if (!result) {
        setError('This share link is invalid or has expired');
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to load shared group');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      const isValid = await verifySharePassword(token, password);

      if (isValid) {
        setRequiresPassword(false);
        loadGroupData();
      } else {
        setPasswordError('Incorrect password');
      }
    } catch {
      setPasswordError('Failed to verify password');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleVenueChange = (clientId: string) => {
    setSelectedClientId(clientId);
    // Update URL params to preserve selection
    setSearchParams({ client: clientId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading shared group...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Access</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go to Homepage</Button>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Password Protected</h2>
            <p className="text-gray-600 mt-1">Enter the password to view this group</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={passwordError ? 'border-red-500' : ''}
            />
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <Button type="submit" className="w-full" disabled={isVerifyingPassword}>
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Access Group'
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!data || !selectedClientId) return null;

  const { group, clients } = data;
  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (!selectedClient) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Group context header - Compact design */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Group Logo */}
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                {group.logo_url ? (
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <div className="leading-tight">
                <div className="text-[10px] opacity-80 uppercase tracking-wide font-medium">Group Report</div>
                <div className="text-sm font-semibold">{group.name}</div>
              </div>
            </div>

            {/* Venue Selector Dropdown */}
            {clients.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-90 font-medium">Venue:</span>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleVenueChange(e.target.value)}
                    className="h-8 pl-2.5 pr-9 border border-white/30 rounded-lg text-xs bg-white/10 backdrop-blur-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer min-w-[180px] hover:bg-white/15 transition-colors"
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id} className="text-slate-900">
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group Description - More compact */}
          {group.description && (
            <div className="mt-1.5 text-xs opacity-85 leading-snug">
              {group.description}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard - No extra spacing */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading dashboard...</span>
            </div>
          </div>
        }
      >
        <EventDashboard isShared={true} clientId={selectedClientId} />
      </Suspense>
    </div>
  );
};

export default SharedGroupView;
