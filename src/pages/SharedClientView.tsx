/**
 * SharedClientView - Public-facing view for a shared individual client
 * Enhanced version that supports token-based access and can show group context
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, AlertCircle, ChevronLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { validateShareToken, verifySharePassword } from '@/services/data/groupService';
import { supabase } from '@/lib/supabase';
import { Client } from '@/services/data/databaseService';
import { SharedClientData } from '@/types/groups';

// Import the existing dashboard components for rendering
const EventDashboard = React.lazy(() => import('./EventDashboard'));

const SharedClientView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<SharedClientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid share link');
      setIsLoading(false);
      return;
    }

    loadClientData();
  }, [token]);

  const loadClientData = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, try to validate as a share token
      const validation = await validateShareToken(token);

      if (validation && validation.valid) {
        // Token-based share
        if (validation.token.resource_type !== 'client') {
          setError('Invalid share link');
          setIsLoading(false);
          return;
        }

        if (validation.requiresPassword) {
          setRequiresPassword(true);
          setIsLoading(false);
          return;
        }

        // Check for group context
        const client = validation.resource as Client;
        const groupContext = await loadGroupContext(client.id, token);

        setData({
          client,
          groupContext,
        });
      } else {
        // Legacy: treat token as direct client ID
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', token)
          .maybeSingle();

        if (clientError || !client) {
          setError('This share link is invalid or has expired');
        } else {
          const groupContext = await loadGroupContext(client.id);
          setData({
            client: client as Client,
            groupContext,
          });
        }
      }
    } catch (err) {
      setError('Failed to load shared client');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupContext = async (
    clientId: string,
    shareToken?: string
  ): Promise<SharedClientData['groupContext'] | undefined> => {
    // Check if client is part of a group that was shared
    const { data: groupClients } = await supabase
      .from('group_clients')
      .select(`
        group:groups(id, name),
        client:clients!group_clients_client_id_fkey(id, name, logo_url)
      `)
      .eq('client_id', clientId);

    if (!groupClients || groupClients.length === 0) return undefined;

    // Find the group that matches the share token if provided
    const matchingGroup = shareToken
      ? groupClients.find((gc) => (gc.group as unknown as { shareable_link: string }).shareable_link === shareToken)
      : groupClients[0];

    if (!matchingGroup) return undefined;

    const group = matchingGroup.group as unknown as { id: string; name: string };

    // Get other clients in the group
    const otherClients = groupClients
      .filter((gc) => (gc.client as unknown as Client).id !== clientId)
      .map((gc) => {
        const c = gc.client as unknown as Client;
        return {
          id: c.id,
          name: c.name,
          logo_url: c.logo_url,
        };
      });

    return {
      groupId: group.id,
      groupName: group.name,
      otherClients,
    };
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
        loadClientData();
      } else {
        setPasswordError('Incorrect password');
      }
    } catch {
      setPasswordError('Failed to verify password');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading dashboard...</span>
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
            <p className="text-gray-600 mt-1">Enter the password to view this dashboard</p>
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
                'Access Dashboard'
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { client, groupContext } = data;

  return (
    <div className="min-h-screen">
      {/* Group context navigation */}
      {groupContext && (
        <div className="bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/share/g/${token}`)}
                className="text-white hover:bg-blue-700"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to {groupContext.groupName}
              </Button>

              <div className="h-4 w-px bg-blue-400" />

              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>{groupContext.otherClients.length + 1} clients in group</span>
              </div>

              {groupContext.otherClients.length > 0 && (
                <>
                  <div className="h-4 w-px bg-blue-400" />
                  <div className="flex -space-x-2">
                    {groupContext.otherClients.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/share/g/${token}/client/${c.id}`)}
                        className="w-8 h-8 rounded-full bg-blue-500 border-2 border-blue-600 flex items-center justify-center text-xs font-medium hover:bg-blue-400 transition-colors"
                        title={c.name}
                      >
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          c.name.charAt(0).toUpperCase()
                        )}
                      </button>
                    ))}
                    {groupContext.otherClients.length > 3 && (
                      <div className="w-8 h-8 rounded-full bg-blue-700 border-2 border-blue-600 flex items-center justify-center text-xs">
                        +{groupContext.otherClients.length - 3}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard */}
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }
      >
        <EventDashboard isShared={true} clientId={client.id} />
      </React.Suspense>
    </div>
  );
};

export default SharedClientView;
