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
      {/* Header with Venue Selector */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Group Logo */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {group.logo_url ? (
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Users className="h-5 w-5" />
                )}
              </div>

              {/* Group Name */}
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Group</div>
                <h1 className="text-base font-semibold text-slate-900">{group.name}</h1>
              </div>
            </div>

            {/* Venue Selector Dropdown */}
            {clients.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Select Venue:</span>
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleViewClient(e.target.value);
                      }
                    }}
                    className="h-9 pl-3 pr-10 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[200px]"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choose a venue...
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Description */}
      {group.description && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-slate-600">{group.description}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Venues in this Group</h2>
          <p className="text-sm text-slate-500">Select a venue from the dropdown above or click below</p>
        </div>

        {clients.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No venues in this group</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-4">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer border-slate-200 hover:shadow-md transition-shadow group"
                onClick={() => handleViewClient(client.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3 mb-3">
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt={`${client.name} logo`}
                        className="w-8 h-8 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 truncate">
                        {client.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : client.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {client.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-slate-400">
            Shared via Marketing Analytics Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SharedGroupView;
