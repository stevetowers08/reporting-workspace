import { ClientForm } from '@/components/agency/ClientForm';
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '@/services/data/databaseService';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  logo_url: string;
  status: 'active' | 'paused' | 'inactive';
  accounts: {
    facebookAds: string;
    googleAds: string;
    goHighLevel: string | {
      locationId: string;
      locationName: string;
      locationToken?: string;
    };
    googleSheets: string;
  };
  conversionActions: {
    facebookAds: string;
    googleAds: string;
  };
  googleSheetsConfig?: {
    spreadsheetId: string;
    sheetName: string;
  };
  tabSettings?: {
    summary?: boolean;
    meta?: boolean;
    google?: boolean;
    leads?: boolean;
  };
  shareable_link: string;
}

const ClientEditPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successLocationName, setSuccessLocationName] = useState<string | null>(null);

  // Handle OAuth success redirect
  useEffect(() => {
    const connected = searchParams.get('connected');
    const ghlConnected = searchParams.get('ghl_connected');
    const location = searchParams.get('location');
    const locationName = searchParams.get('location_name');

    if ((connected === 'true' || ghlConnected === 'true') && location) {
      setShowSuccessMessage(true);
      setSuccessLocationName(locationName);
      
      // Clear the URL parameters after showing the message
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('connected');
      newSearchParams.delete('ghl_connected');
      newSearchParams.delete('location');
      newSearchParams.delete('location_name');
      
      // Update URL without the OAuth parameters
      navigate(`/agency/clients/${clientId}/edit?${newSearchParams.toString()}`, { replace: true });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessLocationName(null);
      }, 5000);
    }
  }, [searchParams, navigate, clientId]);

  // Load client data
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) {
        setError('Client ID is required');
        setLoading(false);
        return;
      }

      try {
        debugLogger.info('ClientEditPage', 'Loading client', { clientId });
        const clientData = await DatabaseService.getClient(clientId);
        
        if (!clientData) {
          setError('Client not found');
          setLoading(false);
          return;
        }

        // Map tabSettings from services if available
        const mappedClient = {
          ...clientData,
          tabSettings: clientData.services?.tabSettings || {
            summary: true,
            meta: true,
            google: true,
            leads: true,
          },
        };
        setClient(mappedClient);
        debugLogger.info('ClientEditPage', 'Client loaded successfully', { clientId, clientName: clientData.name });
      } catch (error) {
        debugLogger.error('ClientEditPage', 'Failed to load client', error);
        setError('Failed to load client');
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [clientId]);

  const handleUpdateClient = async (updates: Partial<Client>) => {
    if (!clientId) {return;}

    try {
      debugLogger.info('ClientEditPage', 'Updating client', { clientId, updates });
      
      // DatabaseService will handle merging tabSettings into services
      await DatabaseService.updateClient(clientId, updates);
      debugLogger.info('ClientEditPage', 'Client updated successfully');
      
      // Navigate back to agency panel
      navigate('/agency');
    } catch (error) {
      debugLogger.error('ClientEditPage', 'Failed to update client', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/agency');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/agency')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Agency Panel
          </button>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Client Not Found</h2>
          <p className="text-gray-600 mb-4">The requested client could not be found.</p>
          <button
            onClick={() => navigate('/agency')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Agency Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">
            GoHighLevel connected successfully!
            {successLocationName && ` (${successLocationName})`}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Edit Client</h1>
              <p className="text-gray-600 mt-1">Update client information and integrations</p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <ClientForm
            initialData={client}
            isEdit={true}
            clientId={clientId}
            onSubmit={handleUpdateClient}
            onCancel={handleCancel}
            cancelLabel="Back to Agency Panel"
          />
        </div>
      </div>
    </div>
  );
};

export default ClientEditPage;
