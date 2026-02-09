/**
 * SharedGroupView - Public-facing view for a shared group
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Lock,
  ArrowRight,
  BarChart3,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button-simple';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { getSharedGroupData, verifySharePassword } from '@/services/data/groupService';
import { SharedGroupData } from '@/types/groups';

const SharedGroupView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<SharedGroupData | null>(null);
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

    loadGroupData();
  }, [token]);

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

  const handleViewClient = (clientId: string) => {
    // Navigate to the individual client dashboard within the shared context
    navigate(`/share/g/${token}/client/${clientId}`);
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

  if (!data) return null;

  const { group, clients } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {group.logo_url ? (
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  group.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
                <p className="text-sm text-gray-500">
                  {clients.length} {clients.length === 1 ? 'client' : 'clients'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Description */}
      {group.description && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-gray-600">{group.description}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No clients in this group</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleViewClient(client.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                      {client.logo_url ? (
                        <img
                          src={client.logo_url}
                          alt={client.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        client.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : client.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {client.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-400 group-hover:text-blue-600 transition-colors">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4" />
                      <span>View Dashboard</span>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Shared via Marketing Analytics Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SharedGroupView;
