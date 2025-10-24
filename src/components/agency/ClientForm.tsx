import { ConnectLocationButton } from '@/components/agency/ConnectLocationButton';
import { GoogleSheetsSelector } from '@/components/integration/GoogleSheetsSelector';
import { LogoManager } from "@/components/ui/LogoManager";
import { Spinner } from "@/components/ui/UnifiedLoadingSystem";
import { Button } from "@/components/ui/button-simple";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label-simple";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch-simple";
import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { AIInsightsConfig, AIInsightsService } from "@/services/ai/aiInsightsService";
import { FacebookAdsService } from "@/services/api/facebookAdsService";
import { GoogleAdsService } from "@/services/api/googleAdsService";
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';
import { FileUploadService } from "@/services/config/fileUploadService";
import { DatabaseService } from "@/services/data/databaseService";
import { AlertCircle, Bot, CheckCircle, ImageIcon, X } from "lucide-react";
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from "react-router-dom";

interface ConnectedAccount {
  id: string;
  name: string;
  platform: string;
}

interface ClientFormData {
  id?: string;
  name: string;
  logo_url: string;
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
}

interface ClientFormProps {
  initialData?: ClientFormData;
  isEdit?: boolean;
  clientId?: string;
  onSubmit: (formData: ClientFormData) => Promise<void>;
  onCancel: () => void;
  cancelLabel?: string;
}

export const ClientForm: React.FC<ClientFormProps> = React.memo(({
  initialData,
  isEdit = false,
  clientId,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel"
}) => {
  debugLogger.info('ClientForm', 'Component loaded with initialData:', initialData);
  debugLogger.info('ClientForm', 'initialData.googleSheetsConfig:', initialData?.googleSheetsConfig);
  debugLogger.info('ClientForm', 'initialData.accounts:', initialData?.accounts);
  
  debugLogger.info('ClientForm', 'Component loaded', { isEdit, clientId, hasInitialData: !!initialData });
  
  const [formData, setFormData] = useState<ClientFormData>(() => {
    const defaultData = {
      name: "",
      logo_url: "",
      accounts: {
        facebookAds: "none",
        googleAds: "none",
        goHighLevel: "none",
        googleSheets: "none",
      },
      conversionActions: {
        facebookAds: "lead",
        googleAds: "conversions",
      },
    };
    
    if (initialData) {
      return {
        ...defaultData,
        ...initialData,
        accounts: {
          ...defaultData.accounts,
          ...(initialData.accounts || {}),
        },
        conversionActions: {
          ...defaultData.conversionActions,
          ...(initialData.conversionActions || {}),
        },
      };
    }
    
    return defaultData;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean>>({});
  const [integrationStatusLoaded, setIntegrationStatusLoaded] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [facebookAccountsLoaded, setFacebookAccountsLoaded] = useState(false);
  const [facebookAccountsLoading, setFacebookAccountsLoading] = useState(false);
  const [googleAccountsLoaded, setGoogleAccountsLoaded] = useState(false);
  const [googleAccountsLoading, setGoogleAccountsLoading] = useState(false);
  const [ghlAccountsLoaded, setGhlAccountsLoaded] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo_url || null);
  const [conversionActions, setConversionActions] = useState<Record<string, unknown[]>>({});
  const [conversionActionsLoading, setConversionActionsLoading] = useState<Record<string, boolean>>({});
  const [logoFile, setLogoFile] = useState<globalThis.File | null>(null);
  const [aiConfig, setAiConfig] = useState<AIInsightsConfig | null>(null);
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<{
    spreadsheetId: string;
    sheetName: string;
  } | null>(null);
  const [googleSheetsSuccess, setGoogleSheetsSuccess] = useState<string | null>(null);
  const [spreadsheetName, setSpreadsheetName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // Fetch spreadsheet name when googleSheetsConfig changes
  useEffect(() => {
    const fetchSpreadsheetName = async () => {
      if (googleSheetsConfig?.spreadsheetId) {
        try {
          const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
          const accessToken = await GoogleSheetsService.getAccessToken();
          
          if (accessToken) {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsConfig.spreadsheetId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              setSpreadsheetName(data.properties?.title || 'Unknown Spreadsheet');
            } else {
              setSpreadsheetName('Unknown Spreadsheet');
            }
          }
        } catch (error) {
          debugLogger.error('ClientForm', 'Failed to fetch spreadsheet name', error);
          setSpreadsheetName('Unknown Spreadsheet');
        }
      } else {
        setSpreadsheetName(null);
      }
    };

    fetchSpreadsheetName();
  }, [googleSheetsConfig?.spreadsheetId]);
  
  // Edit states for each integration
  const [editingIntegrations, setEditingIntegrations] = useState<Record<string, boolean>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, string | { spreadsheetId: string; sheetName: string }>>({});

  // Load Facebook Ads accounts when needed
  const loadFacebookAccounts = useCallback(async (forceRefresh = false) => {
    if (facebookAccountsLoaded && !forceRefresh || facebookAccountsLoading) {
      return;
    }
    
    debugLogger.info('ClientForm', 'Loading Facebook accounts on demand', { forceRefresh });
    setFacebookAccountsLoading(true);
    
    try {
      debugLogger.info('ClientForm', 'Calling FacebookAdsService.getAdAccounts');
      const adAccounts = forceRefresh 
        ? await FacebookAdsService.refreshAdAccounts()
        : await FacebookAdsService.getAdAccounts();
      debugLogger.info('ClientForm', 'Facebook API response received', { accountCount: adAccounts.length });
      
      const facebookAccounts = adAccounts.map(account => ({
        id: account.id,
        name: `${account.name || 'Facebook Ad Account'} (${account.id})`,
        platform: 'facebookAds' as const
      }));
      
      // Check specifically for Savanna Rooftop in the raw API response
      const savannaInRaw = adAccounts.find(acc => acc.name?.toLowerCase().includes('savanna'));
      if (savannaInRaw) {
        debugLogger.info('ClientForm', 'Found Savanna Rooftop in raw API response', savannaInRaw);
      } else {
        debugLogger.debug('ClientForm', 'Savanna Rooftop not found in raw API response', { 
          accountNames: adAccounts.map(acc => acc.name) 
        });
      }
      
      // Check specifically for Savanna Rooftop in the mapped accounts
      const savannaInMapped = facebookAccounts.find(acc => acc.name?.toLowerCase().includes('savanna'));
      if (savannaInMapped) {
        debugLogger.info('ClientForm', 'Found Savanna Rooftop in mapped accounts', savannaInMapped);
      } else {
        debugLogger.debug('ClientForm', 'Savanna Rooftop not found in mapped accounts', { 
          mappedAccountNames: facebookAccounts.map(acc => acc.name) 
        });
      }
      
      setConnectedAccounts(prev => [
        ...prev.filter(acc => acc.platform !== 'facebookAds'),
        ...facebookAccounts
      ]);
      
      setFacebookAccountsLoaded(true);
      debugLogger.info('ClientForm', 'Facebook accounts loaded successfully', { 
        accountCount: facebookAccounts.length,
        accounts: facebookAccounts 
      });
    } catch (error) {
      debugLogger.error('ClientForm', 'Failed to load Facebook accounts', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Facebook accounts';
      debugLogger.warn('ClientForm', 'Facebook accounts loading failed', { errorMessage });
      
      // Add error indicator to connected accounts so user knows there was an issue
      setConnectedAccounts(prev => [
        ...prev.filter(acc => acc.platform !== 'facebookAds'),
        {
          id: 'facebook_error',
          name: `Error: ${errorMessage}`,
          platform: 'facebookAds' as const
        }
      ]);
      
      // Still mark as loaded to prevent repeated attempts
      setFacebookAccountsLoaded(true);
    } finally {
      setFacebookAccountsLoading(false);
    }
  }, [facebookAccountsLoaded, facebookAccountsLoading]);

  // Load Google Ads accounts when needed with caching
  const loadGoogleAccounts = useCallback(async (forceReload = false) => {
    debugLogger.info('ClientForm', 'loadGoogleAccounts function called', { forceReload, googleAccountsLoaded });
    
    if (googleAccountsLoaded && !forceReload || googleAccountsLoading) {
      debugLogger.debug('ClientForm', 'Google accounts already loaded or loading, skipping');
      return;
    }
    
    // Check cache first
    const cacheKey = 'googleAds_accounts_cache';
    const cacheExpiry = 'googleAds_accounts_cache_expiry';
    const now = Date.now();
    const cacheTime = 5 * 60 * 1000; // 5 minutes cache
    
    if (!forceReload) {
      try {
        const cachedAccounts = localStorage.getItem(cacheKey);
        const cachedExpiry = localStorage.getItem(cacheExpiry);
        
        if (cachedAccounts && cachedExpiry && (now - parseInt(cachedExpiry)) < cacheTime) {
          debugLogger.info('ClientForm', 'Using cached Google Ads accounts');
          const accounts = JSON.parse(cachedAccounts);
          setConnectedAccounts(prev => {
            const filteredPrev = prev.filter(acc => acc.platform !== 'googleAds');
            return [...filteredPrev, ...accounts];
          });
          setGoogleAccountsLoaded(true);
          return;
        }
      } catch (error) {
        debugLogger.warn('ClientForm', 'Failed to read cache, fetching fresh data', error);
      }
    }
    
    debugLogger.info('ClientForm', 'Loading Google Ads accounts from API');
    setGoogleAccountsLoading(true);
    
    try {
      debugLogger.info('ClientForm', 'Calling GoogleAdsService.getAdAccounts');
      const googleAccounts = await GoogleAdsService.getAdAccounts();
      debugLogger.info('ClientForm', 'Google Ads API response received', { accountCount: googleAccounts.length });
      
      const accounts = googleAccounts.map(account => ({
        id: account.id,
        name: account.name,
        platform: 'googleAds' as const
      }));
      
      // Cache the results
      try {
        localStorage.setItem(cacheKey, JSON.stringify(accounts));
        localStorage.setItem(cacheExpiry, now.toString());
        debugLogger.info('ClientForm', 'Cached Google Ads accounts');
      } catch (cacheError) {
        debugLogger.warn('ClientForm', 'Failed to cache accounts', cacheError);
      }
      
      setConnectedAccounts(prev => {
        // Remove existing Google Ads accounts to avoid duplicates
        const filteredPrev = prev.filter(acc => acc.platform !== 'googleAds');
        return [...filteredPrev, ...accounts];
      });
      setGoogleAccountsLoaded(true);
      debugLogger.info('ClientForm', 'Google Ads accounts loaded successfully', { accountCount: accounts.length });
    } catch (error) {
      debugLogger.error('ClientForm', 'Google Ads error', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Google Ads accounts';
      
      // Add error to connected accounts so user knows there was an issue
      setConnectedAccounts(prev => [...prev, {
        id: 'google_error',
        name: `Error: ${errorMessage}`,
        platform: 'googleAds' as const
      }]);
      setGoogleAccountsLoaded(true);
    } finally {
      setGoogleAccountsLoading(false);
    }
  }, [googleAccountsLoaded, googleAccountsLoading]);

  // Load GoHighLevel accounts when needed (simplified for location-level OAuth)
  const loadGHLAccounts = useCallback(async () => {
    if (ghlAccountsLoaded) {
      return;
    }
    
    debugLogger.info('ClientForm', 'Loading GoHighLevel accounts on demand');
    
    try {
      debugLogger.info('ClientForm', 'Getting integrations from database');
      const integrations = await DatabaseService.getIntegrations();
      debugLogger.info('ClientForm', 'Integrations from database', { integrationCount: integrations.length });
      
      const ghlIntegration = integrations.find(i => i.platform === 'goHighLevel');
      debugLogger.info('ClientForm', 'GoHighLevel integration found', ghlIntegration);
      
      // Check if there's an OAuth connection with tokens
      const hasOAuthConnection = ghlIntegration?.config?.tokens?.accessToken;
      
      if (hasOAuthConnection) {
        debugLogger.info('ClientForm', 'GoHighLevel OAuth connection found');
        setConnectedAccounts(prev => [...prev, {
          id: 'ghl_connected',
          name: 'GoHighLevel Connected',
          platform: 'goHighLevel' as const
        }]);
        setGhlAccountsLoaded(true);
        debugLogger.info('ClientForm', 'GoHighLevel connection confirmed');
      } else {
        debugLogger.info('ClientForm', 'GoHighLevel not connected, adding not connected option');
        setConnectedAccounts(prev => [...prev, {
          id: 'ghl_not_connected',
          name: 'GoHighLevel not connected',
          platform: 'goHighLevel' as const
        }]);
        setGhlAccountsLoaded(true);
      }
    } catch (error) {
      debugLogger.error('ClientForm', 'GoHighLevel error', error);
      // Add error to connected accounts so user knows there was an issue
      setConnectedAccounts(prev => [...prev, {
        id: 'ghl_error',
        name: 'Error loading GoHighLevel locations',
        platform: 'goHighLevel' as const
      }]);
      setGhlAccountsLoaded(true);
    }
  }, [ghlAccountsLoaded]);

  const loadAIConfig = useCallback(async () => {
    if (!clientId) {
      return;
    }
    
    try {
      const config = await AIInsightsService.getClientAIConfig(clientId);
      setAiConfig(config);
    } catch (error) {
      debugLogger.error('ClientForm', 'Error loading AI config', error);
    }
  }, [clientId]);

  const handleLogoUpload = async (e: React.ChangeEvent<globalThis.HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setErrors({});

      try {
        // Upload file to Supabase Storage
        const logoUrl = await FileUploadService.uploadClientLogo(file, formData.name || 'client');

        // Create preview URL for immediate display
        const previewUrl = window.URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        setFormData(prev => ({ ...prev, logo_url: logoUrl }));

        debugLogger.info('ClientForm', 'Logo uploaded successfully', { logoUrl });
      } catch (error) {
        debugLogger.error('ClientForm', 'Error uploading logo', error);
        setErrors({ logo: error instanceof Error ? error.message : 'Failed to upload logo. Please try again.' });
      }
    }
  };

  const removeLogo = () => {
    if (logoPreview) {
      window.URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    setLogoFile(null);
    setFormData(prev => ({ ...prev, logo_url: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    debugLogger.info('ClientForm', 'Form submission started', { formData, isEdit, clientId });

    // Clear previous success/error messages
    setSubmitSuccess(null);
    setErrors({});

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Client name is required";
    }

    // Validate name length and characters
    if (formData.name && formData.name.length > 100) {
      newErrors.name = "Client name must be less than 100 characters";
    }

    // Validate name contains only allowed characters
    if (formData.name && !/^[a-zA-Z0-9\s\-_&.()]+$/.test(formData.name)) {
      newErrors.name = "Client name contains invalid characters";
    }

    // Validate logo URL if provided
    if (formData.logo_url && formData.logo_url.trim() !== '') {
      try {
        new URL(formData.logo_url);
      } catch {
        newErrors.logo = "Logo URL must be a valid URL";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      debugLogger.warn('ClientForm', 'Form validation failed', newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Update AI config if it exists and we're editing
      if (isEdit && clientId && aiConfig) {
        try {
          debugLogger.info('ClientForm', 'Updating AI config', { clientId, aiConfig });
          await AIInsightsService.createOrUpdateClientAIConfig(clientId, {
            enabled: aiConfig.enabled,
            frequency: aiConfig.frequency
          });
          debugLogger.info('ClientForm', 'AI config updated successfully');
        } catch (error) {
          debugLogger.error('ClientForm', 'Error updating AI config', error);
        }
      }

      // Include Google Sheets configuration if available
      const submitData = {
        ...formData,
        accounts: {
          ...formData.accounts,
          // Convert GoHighLevel object to string for validation
          goHighLevel: typeof formData.accounts.goHighLevel === 'object' 
            ? formData.accounts.goHighLevel?.locationId || 'none'
            : formData.accounts.goHighLevel || 'none',
          googleSheets: googleSheetsConfig?.spreadsheetId || 'none'
        },
        googleSheetsConfig: googleSheetsConfig
      };

      debugLogger.info('ClientForm', 'Calling onSubmit with formData', submitData);
      await onSubmit({
        ...submitData,
        googleSheetsConfig: submitData.googleSheetsConfig || undefined
      });

      // Only show success message if onSubmit completed successfully
      setSubmitSuccess(`${isEdit ? 'Client updated' : 'Client created'} successfully!`);
      
      // Clear success message after 2 seconds and close modal
      globalThis.setTimeout(() => {
        setSubmitSuccess(null);
        if (isEdit) {
          onCancel(); // Close the modal
        }
      }, 2000);

    } catch (error) {
      debugLogger.error('ClientForm', 'Form submission failed', error);
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to save client. Please try again.';
      setErrors({ submit: errorMessage });
      
      // Log to console for debugging
      // console.error('ClientForm submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIEnabledChange = (enabled: boolean) => {
    if (aiConfig) {
      setAiConfig(prev => prev ? { ...prev, enabled } : null);
    } else if (clientId) {
      // Create new config if it doesn't exist
      setAiConfig({
        id: '',
        clientId: clientId,
        enabled,
        frequency: 'weekly',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleAIFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    if (aiConfig) {
      setAiConfig(prev => prev ? { ...prev, frequency } : null);
    }
  };

  const handleAccountSelect = (platform: keyof typeof formData.accounts, accountId: string) => {
    // Store pending changes instead of immediately updating form data
    setPendingChanges(prev => ({
      ...prev,
      [platform]: accountId
    }));
  };

  const handleEditIntegration = (platform: string) => {
    setEditingIntegrations(prev => ({
      ...prev,
      [platform]: true
    }));
  };

  const handleCancelEdit = (platform: string) => {
    setEditingIntegrations(prev => ({
      ...prev,
      [platform]: false
    }));
    setPendingChanges(prev => {
      const newPending = { ...prev };
      delete newPending[platform];
      return newPending;
    });
  };

  const handleSaveIntegration = (platform: string) => {
    const pendingValue = pendingChanges[platform];
    if (pendingValue !== undefined) {
      setFormData(prev => {
        if (platform === 'goHighLevel') {
          if (typeof pendingValue === 'string' && pendingValue === "none") {
            return {
              ...prev,
              accounts: {
                ...prev.accounts,
                goHighLevel: "none",
              },
            };
          }
          
          if (typeof pendingValue === 'string') {
            // Find the selected location details
            const selectedLocation = connectedAccounts.find(account => 
              account.platform === 'goHighLevel' && account.id === pendingValue
            );
            
            if (selectedLocation) {
              return {
                ...prev,
                accounts: {
                  ...prev.accounts,
                  goHighLevel: {
                    locationId: pendingValue,
                    locationName: selectedLocation.name,
                    locationToken: undefined
                  },
                },
              };
            }
          }
        }
        
        // Default handling for other platforms
        if (typeof pendingValue === 'string') {
          return {
            ...prev,
            accounts: {
              ...prev.accounts,
              [platform]: pendingValue === "none" ? "" : pendingValue,
            },
          };
        }
        
        return prev;
      });
    }

    // Clear edit state and pending changes
    setEditingIntegrations(prev => ({
      ...prev,
      [platform]: false
    }));
    setPendingChanges(prev => {
      const newPending = { ...prev };
      delete newPending[platform];
      return newPending;
    });
  };

  const handleDisconnectGHL = async () => {
    try {
      debugLogger.info('ClientForm', 'Disconnecting GoHighLevel');
      
      // Clear the form data
      setFormData(prev => ({
        ...prev,
        accounts: {
          ...prev.accounts,
          goHighLevel: 'none'
        }
      }));
      
      // Disconnect from database
      await DatabaseService.disconnectIntegration('goHighLevel');
      
      debugLogger.info('ClientForm', 'GoHighLevel disconnected successfully');
      
      // Refresh integration status
      window.location.reload();
    } catch (error) {
      debugLogger.error('ClientForm', 'Failed to disconnect GoHighLevel', error);
      window.alert('Failed to disconnect GoHighLevel. Please try again.');
    }
  };

  const handleConversionActionSelect = (platform: string, actionType: string) => {
    debugLogger.info('ClientForm', 'handleConversionActionSelect called with:', { platform, actionType });
    debugLogger.info('ClientForm', 'Conversion action selected', { platform, actionType });
    setFormData(prev => ({
      ...prev,
      conversionActions: {
        ...prev.conversionActions,
        [platform]: actionType
      }
    }));
    debugLogger.info('ClientForm', 'Form data updated');
  };

  const loadFacebookConversionActions = useCallback(async (adAccountId: string) => {
    try {
      debugLogger.info('ClientForm', 'Loading Facebook conversion actions', { adAccountId });
      setConversionActionsLoading(prev => ({ ...prev, facebookAds: true }));
      
      // Ensure account ID has proper format
      const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      debugLogger.info('ClientForm', 'Formatted account ID for conversion actions', { original: adAccountId, formatted: formattedAccountId });
      
      const actions = await FacebookAdsService.getConversionActions(formattedAccountId);
      debugLogger.info('ClientForm', 'Facebook conversion actions loaded', { actions });
      setConversionActions(prev => ({
        ...prev,
        facebookAds: actions
      }));
    } catch (error) {
      debugLogger.error('ClientForm', 'Failed to load Facebook conversion actions', error);
      // Set fallback actions on error
      setConversionActions(prev => ({
        ...prev,
        facebookAds: [
          { id: 'lead', name: 'Lead' },
          { id: 'purchase', name: 'Purchase' },
          { id: 'add_to_cart', name: 'Add to Cart' },
          { id: 'view_content', name: 'View Content' },
          { id: 'signup', name: 'Sign Up' }
        ]
      }));
    } finally {
      setConversionActionsLoading(prev => ({ ...prev, facebookAds: false }));
    }
  }, []);

  const loadGoogleConversionActions = async (customerId: string) => {
    try {
      const actions = await GoogleAdsService.getConversionActions(customerId);
      setConversionActions(prev => ({
        ...prev,
        googleAds: actions
      }));
    } catch (error) {
      debugLogger.error('ClientForm', 'Failed to load Google Ads conversion actions', error);
    }
  };

  const getAvailableAccounts = (platform: string) => {
    const accounts = connectedAccounts.filter(account => account.platform === platform);
    debugLogger.debug('ClientForm', `getAvailableAccounts(${platform})`, { 
      accountCount: accounts.length,
      totalConnectedAccounts: connectedAccounts.length,
      accounts 
    });
    
    // Check if the current account ID is in the loaded accounts
    const currentAccountId = formData.accounts[platform as keyof typeof formData.accounts];
    const hasCurrentAccount = accounts.some(acc => acc.id === currentAccountId);
    
    // If current account is not in loaded accounts but exists, add it
    if (currentAccountId && currentAccountId !== 'none' && !hasCurrentAccount) {
      debugLogger.info('ClientForm', `Adding current ${platform} account to available accounts:`, currentAccountId);
      debugLogger.info('ClientForm', `Adding current ${platform} account to available accounts`, { currentAccountId });
      
      // Create a placeholder account for the current selection
      const currentAccount = {
        id: currentAccountId,
        name: `${platform === 'googleAds' ? 'Google Ads' : platform === 'facebookAds' ? 'Facebook Ads' : platform} Account (${currentAccountId})`,
        platform: platform as 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets'
      };
      
      accounts.unshift(currentAccount); // Add to beginning
    }
    
    // Check specifically for Savanna Rooftop
    const savannaAccount = accounts.find(acc => acc.name?.toLowerCase().includes('savanna'));
    if (savannaAccount) {
      debugLogger.info('ClientForm', 'Found Savanna Rooftop in getAvailableAccounts', savannaAccount);
    } else {
      debugLogger.debug('ClientForm', 'Savanna Rooftop not found in getAvailableAccounts');
    }
    
    return accounts;
  };

  // Synchronous version for UI rendering
  const isIntegrationConnectedSync = (platform: string): boolean => {
    debugLogger.debug('ClientForm', 'Checking integration status', { platform, accounts: formData.accounts });
    
    // Check if client has selected an account for this platform
    const accountId = formData.accounts[platform as keyof typeof formData.accounts];
    const hasAccount = accountId && accountId !== 'none' && accountId !== '';
    
    debugLogger.debug('ClientForm', 'Integration status result', { platform, hasAccount, accountId });
    
    return Boolean(hasAccount);
  };

  // Async version for account loading
  const isIntegrationConnected = useCallback(async (platform: string): Promise<boolean> => {
    debugLogger.debug('ClientForm', `Checking if ${platform} is connected (async)`);
    
    // For GoHighLevel, it's always client-level only - check if client has location configured
    if (platform === 'goHighLevel') {
      const hasLocationId = typeof formData.accounts.goHighLevel === 'string' 
        ? formData.accounts.goHighLevel && formData.accounts.goHighLevel !== 'none'
        : formData.accounts.goHighLevel?.locationId && formData.accounts.goHighLevel?.locationId !== 'none';
      
      debugLogger.debug('ClientForm', 'GoHighLevel client-level check', {
        hasLocationId,
        formData: formData.accounts.goHighLevel
      });
      return Boolean(hasLocationId);
    }
    
    // For other platforms, check agency integration status
    // If integrationStatus is not yet loaded, check directly with TokenManager
    if (integrationStatus[platform] === undefined) {
      try {
        if (platform === 'googleSheets') {
          const isConnected = await GoogleSheetsOAuthService.getSheetsAuthStatus();
          debugLogger.debug('ClientForm', `Direct check isIntegrationConnected(${platform}) = ${isConnected}`);
          return isConnected;
        } else {
          // Simple database check
          const { data: integrations } = await supabase
            .from('integrations')
            .select('platform')
            .eq('connected', true)
            .eq('platform', platform);
          
          const isConnected = Boolean(integrations && integrations.length > 0);
          debugLogger.debug('ClientForm', `Direct check isIntegrationConnected(${platform}) = ${isConnected}`);
          return isConnected;
        }
      } catch (error) {
        debugLogger.error('ClientForm', `Error checking ${platform} status directly`, error);
        return false;
      }
    }
    
    if (!integrationStatusLoaded) {
      return false; // Return false while loading
    }
    
    const isConnected = integrationStatus[platform] || false;
    debugLogger.debug('ClientForm', `isIntegrationConnected(${platform}) = ${isConnected}`);
    return isConnected;
  }, [formData.accounts.goHighLevel, integrationStatus, integrationStatusLoaded]);

  // Load AI config when component mounts (for edit mode)
  useEffect(() => {
    if (isEdit && clientId) {
      loadAIConfig();
    }
  }, [isEdit, clientId, integrationStatusLoaded, loadAIConfig]);

  // Load accounts for platforms that have account IDs in initial data
  useEffect(() => {
    if (initialData?.accounts) {
      debugLogger.info('ClientForm', 'Initial data received, checking for account IDs to load', initialData.accounts);
      
      // Load Facebook accounts if we have a Facebook account ID
      if (initialData.accounts?.facebookAds && initialData.accounts.facebookAds !== 'none') {
        debugLogger.info('ClientForm', 'Loading Facebook accounts for existing account ID', initialData.accounts.facebookAds);
        loadFacebookAccounts();
      }
      
      // Load Google Ads accounts if we have a Google Ads account ID
      if (initialData.accounts?.googleAds && initialData.accounts.googleAds !== 'none') {
        debugLogger.info('ClientForm', 'Loading Google Ads accounts for existing account ID', initialData.accounts.googleAds);
        loadGoogleAccounts();
      }
      
      // Load GoHighLevel accounts if we have a GoHighLevel account ID
      if (initialData.accounts?.goHighLevel && initialData.accounts.goHighLevel !== 'none') {
        debugLogger.info('ClientForm', 'Loading GoHighLevel accounts for existing account ID', initialData.accounts.goHighLevel);
        loadGHLAccounts();
      }
    }
  }, [initialData, isIntegrationConnected, loadFacebookAccounts, loadGHLAccounts, loadGoogleAccounts]);

  // Load conversion actions when Facebook Ads account changes
  useEffect(() => {
    if (formData.accounts.facebookAds && formData.accounts.facebookAds !== 'none') {
      debugLogger.info('ClientForm', 'Facebook Ads account changed, loading conversion actions', { 
        accountId: formData.accounts.facebookAds 
      });
      loadFacebookConversionActions(formData.accounts.facebookAds);
    } else {
      debugLogger.debug('ClientForm', 'Facebook Ads account not set or is none, skipping conversion actions load');
    }
  }, [formData.accounts.facebookAds, loadFacebookConversionActions]);

  // Load conversion actions when Google Ads account changes
  useEffect(() => {
    if (formData.accounts.googleAds && formData.accounts.googleAds !== 'none') {
      loadGoogleConversionActions(formData.accounts.googleAds);
    }
  }, [formData.accounts.googleAds]);

  // Initialize Google Sheets configuration from initial data
  useEffect(() => {
    debugLogger.info('ClientForm', 'Initializing Google Sheets config from initial data');
    debugLogger.info('ClientForm', 'initialData:', initialData);
    debugLogger.info('ClientForm', 'initialData.googleSheetsConfig:', initialData?.googleSheetsConfig);
    
    if (initialData?.googleSheetsConfig) {
      debugLogger.info('ClientForm', 'Setting Google Sheets config:', initialData.googleSheetsConfig);
      setGoogleSheetsConfig(initialData.googleSheetsConfig);
      debugLogger.info('ClientForm', 'Initialized Google Sheets config from initial data', initialData.googleSheetsConfig);
    } else {
      debugLogger.info('ClientForm', 'No Google Sheets config in initial data');
    }
  }, [initialData]);

  // Load integration status using TokenManager
  useEffect(() => {
    debugLogger.info('ClientForm', 'Loading integration status');
    
    const loadIntegrationStatus = async () => {
      try {
        debugLogger.debug('ClientForm', 'Checking integrations from database');

        // Simple approach: Just check if integrations exist in database
        const { data: integrations, error } = await supabase
          .from('integrations')
          .select('platform')
          .eq('connected', true);

        const statusMap: Record<string, boolean> = { facebookAds: false, googleAds: false, googleSheets: false };

        if (error) {
          debugLogger.error('ClientForm', 'Failed to load integrations', error);
        } else {
          debugLogger.debug('ClientForm', 'Found connected integrations', integrations);
          // Set to true if found in database
          integrations?.forEach(integration => {
            if (integration.platform === 'facebookAds' || integration.platform === 'googleAds' || integration.platform === 'googleSheets') {
              statusMap[integration.platform] = true;
            }
          });
        }

        debugLogger.debug('ClientForm', 'Integration status loaded', statusMap);
        setIntegrationStatus(statusMap);
        setIntegrationStatusLoaded(true);
      } catch (error) {
        debugLogger.error('ClientForm', 'Error loading integration status', error);
        setIntegrationStatus({});
        setIntegrationStatusLoaded(true);
      }
    };

    loadIntegrationStatus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium">Client Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter client name"
          className={`mt-1 ${errors.name ? "border-red-500" : ""}`}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>


      <div>
        <Label className="text-sm font-medium">Client Logo</Label>
        <div className="mt-1 space-y-3">
          {logoPreview ? (
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-12 h-12 object-cover rounded-lg border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{logoFile?.name || 'Current logo'}</p>
                <p className="text-xs text-gray-500">
                  {logoFile ? `${(logoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Existing logo'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={removeLogo}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <label
                htmlFor="logo-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <ImageIcon className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload logo</p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </label>
            </div>
          )}
          {errors.logo && <p className="text-xs text-red-500">{errors.logo}</p>}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Integrations</Label>
        <div className="space-y-3 mt-2">
          {/* Facebook Ads */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LogoManager 
                  platform="meta" 
                  size={16} 
                  context="client-form"
                  className="text-blue-600"
                  fallback={
                    <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">f</span>
                    </div>
                  }
                />
                <span className="text-sm font-medium">Facebook Ads</span>
              </div>
              {isIntegrationConnectedSync('facebookAds') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {integrationStatusLoaded && integrationStatus.facebookAds === true ? (
              <div className="space-y-3">
                {editingIntegrations.facebookAds ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Ad Account</Label>
                      <SearchableSelect
                        options={[
                          { value: "none", label: "None" },
                          ...getAvailableAccounts('facebookAds').map(account => ({
                            value: account.id,
                            label: account.name
                          }))
                        ]}
                        value={(() => {
                          const pendingValue = pendingChanges.facebookAds ?? formData.accounts.facebookAds;
                          return typeof pendingValue === 'string' ? pendingValue : "none";
                        })()}
                        onValueChange={(value) => handleAccountSelect("facebookAds", value)}
                        placeholder="Select account"
                        searchPlaceholder="Search accounts..."
                        className="mt-1"
                        onOpenChange={(open) => {
                          if (open && !facebookAccountsLoaded && !facebookAccountsLoading) {
                            loadFacebookAccounts();
                          }
                        }}
                      />
                    </div>
                    
                    {((pendingChanges.facebookAds ?? formData.accounts.facebookAds) && 
                     (pendingChanges.facebookAds ?? formData.accounts.facebookAds) !== 'none') && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Conversion Action</Label>
                        {conversionActionsLoading.facebookAds ? (
                          <div className="flex items-center gap-2 mt-1 p-2 border border-gray-200 rounded">
                            <Spinner size="sm" />
                            <span className="text-sm text-gray-500">Loading conversion actions...</span>
                          </div>
                        ) : (
                          <Select
                            value={formData.conversionActions.facebookAds || "lead"}
                            onValueChange={(value) => {
                              debugLogger.info('ClientForm', 'Facebook conversion action Select changed to:', value);
                              handleConversionActionSelect("facebookAds", value);
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                              {conversionActions.facebookAds && conversionActions.facebookAds.length > 0 ? (
                                (conversionActions.facebookAds as Array<{ id: string; name: string }>).map((action) => (
                                  <SelectItem key={action.id} value={action.id}>
                                    {action.name}
                                  </SelectItem>
                                ))
                              ) : (
                                // Fallback options when no conversion actions are loaded
                                [
                                  { id: 'lead', name: 'Lead' },
                                  { id: 'purchase', name: 'Purchase' },
                                  { id: 'add_to_cart', name: 'Add to Cart' },
                                  { id: 'view_content', name: 'View Content' },
                                  { id: 'signup', name: 'Sign Up' }
                                ].map((action) => (
                                  <SelectItem key={action.id} value={action.id}>
                                    {action.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => handleSaveIntegration('facebookAds')}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelEdit('facebookAds')}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <div className="font-medium text-gray-700">
                        {formData.accounts.facebookAds && formData.accounts.facebookAds !== 'none' 
                          ? getAvailableAccounts('facebookAds').find(acc => acc.id === formData.accounts.facebookAds)?.name || 'Unknown Account'
                          : 'No account selected'
                        }
                      </div>
                      {formData.conversionActions.facebookAds && (
                        <div className="text-gray-500 mt-1">
                          Action: {formData.conversionActions.facebookAds}
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditIntegration('facebookAds')}
                      className="w-full"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-2">Not connected</p>
                <Link to="/agency" className="text-blue-600 hover:underline text-sm">
                  Connect Facebook Ads
                </Link>
              </div>
            )}
          </div>

          {/* Google Ads */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LogoManager 
                  platform="googleAds" 
                  size={16} 
                  context="client-form"
                  className="text-red-600"
                  fallback={
                    <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">G</span>
                    </div>
                  }
                />
                <span className="text-sm font-medium">Google Ads</span>
              </div>
              {isIntegrationConnectedSync('googleAds') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {integrationStatusLoaded && integrationStatus.googleAds === true ? (
              <div className="space-y-3">
                {editingIntegrations.googleAds ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Ad Account</Label>
                      <SearchableSelect
                        options={[
                          { value: "none", label: "None" },
                          ...getAvailableAccounts('googleAds').map(account => ({
                            value: account.id,
                            label: account.name
                          }))
                        ]}
                        value={(() => {
                          const pendingValue = pendingChanges.googleAds ?? formData.accounts.googleAds;
                          return typeof pendingValue === 'string' ? pendingValue : "none";
                        })()}
                        onValueChange={(value) => handleAccountSelect("googleAds", value)}
                        placeholder="Select account"
                        searchPlaceholder="Search accounts..."
                        className="mt-1"
                        onOpenChange={(open) => {
                          if (open && !googleAccountsLoaded && !googleAccountsLoading) {
                            loadGoogleAccounts(true); // Force reload to get latest accounts
                          }
                        }}
                      />
                      {googleAccountsLoading && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                          <Spinner size="sm" />
                          Loading Google Ads accounts...
                        </div>
                      )}
                    </div>
                    
                    {((pendingChanges.googleAds ?? formData.accounts.googleAds) && 
                     (pendingChanges.googleAds ?? formData.accounts.googleAds) !== 'none') && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Conversion Action</Label>
                        <SearchableSelect
                          options={[
                            { value: "conversions", label: "Conversions" },
                            ...(conversionActions.googleAds as Array<{ id: string; name: string }> || []).map((action) => ({
                              value: action.id,
                              label: action.name
                            }))
                          ]}
                          value={formData.conversionActions?.googleAds || "conversions"}
                          onValueChange={(value) => handleConversionActionSelect("googleAds", value)}
                          placeholder="Select action"
                          searchPlaceholder="Search actions..."
                          className="mt-1"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => handleSaveIntegration('googleAds')}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelEdit('googleAds')}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <div className="font-medium text-gray-700">
                        {formData.accounts.googleAds && formData.accounts.googleAds !== 'none' 
                          ? getAvailableAccounts('googleAds').find(acc => acc.id === formData.accounts.googleAds)?.name || 'Unknown Account'
                          : 'No account selected'
                        }
                      </div>
                      {formData.conversionActions.googleAds && (
                        <div className="text-gray-500 mt-1">
                          Action: {formData.conversionActions.googleAds}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Debug: Account ID: {formData.accounts.googleAds}, Available: {getAvailableAccounts('googleAds').length}
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditIntegration('googleAds')}
                      className="w-full"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-2">Not connected</p>
                <Link to="/agency" className="text-blue-600 hover:underline text-sm">
                  Connect Google Ads
                </Link>
              </div>
            )}
          </div>

          {/* GoHighLevel */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LogoManager 
                  platform="goHighLevel" 
                  size={16} 
                  context="client-form"
                  className="text-purple-600"
                  fallback={
                    <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">G</span>
                    </div>
                  }
                />
                <span className="text-sm font-medium">GoHighLevel CRM</span>
              </div>
              {isIntegrationConnectedSync('goHighLevel') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {isIntegrationConnectedSync('goHighLevel') ? (
              <div className="space-y-3">
                {typeof formData.accounts.goHighLevel === 'object' && formData.accounts.goHighLevel?.locationId && (
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <div className="font-medium text-gray-700">{formData.accounts.goHighLevel.locationName}</div>
                    <div className="text-gray-500">ID: {formData.accounts.goHighLevel.locationId}</div>
                  </div>
                )}
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={handleDisconnectGHL}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <ConnectLocationButton 
                  clientId={clientId || 'new_client'}
                  onConnected={async () => {
                    // Refresh GHL accounts to show updated connection status
                    setGhlAccountsLoaded(false);
                    await loadGHLAccounts();
                    
                    // Also refresh integration status to update the connection indicator
                    debugLogger.info('ClientForm', 'Refreshing integration status after GHL connection');
                    const { data: integrations, error } = await supabase
                      .from('integrations')
                      .select('platform')
                      .eq('connected', true);

                    const statusMap: Record<string, boolean> = { facebookAds: false, googleAds: false, googleSheets: false };

                    if (error) {
                      debugLogger.error('ClientForm', 'Failed to refresh integrations', error);
                    } else {
                      integrations?.forEach(integration => {
                        if (integration.platform === 'goHighLevel') {
                          statusMap.goHighLevel = true;
                        } else if (integration.platform === 'facebookAds') {
                          statusMap.facebookAds = true;
                        } else if (integration.platform === 'googleAds') {
                          statusMap.googleAds = true;
                        } else if (integration.platform === 'googleSheets') {
                          statusMap.googleSheets = true;
                        }
                      });
                    }

                    setIntegrationStatus(statusMap);
                    debugLogger.info('ClientForm', 'Integration status refreshed', statusMap);
                  }}
                />
              </div>
            )}
          </div>

          {/* Google Sheets */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LogoManager 
                  platform="googleSheets" 
                  size={16} 
                  context="client-form"
                  className="text-green-600"
                  fallback={
                    <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">S</span>
                    </div>
                  }
                />
                <span className="text-sm font-medium">Google Sheets</span>
              </div>
              {isIntegrationConnectedSync('googleSheets') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {integrationStatusLoaded && integrationStatus.googleSheets === true ? (
              <div 
                className="space-y-3"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {editingIntegrations.googleSheets ? (
                  <div className="space-y-3">
                    <GoogleSheetsSelector
                      initialSpreadsheetId={googleSheetsConfig?.spreadsheetId}
                      initialSheetName={googleSheetsConfig?.sheetName}
                      hideSaveButton={true}
                      onSelectionComplete={(spreadsheetId, sheetName) => {
                        debugLogger.info('ClientForm', 'onSelectionComplete called with:', { spreadsheetId, sheetName });
                        debugLogger.info('ClientForm', 'GoogleSheets onSelectionComplete called', { spreadsheetId, sheetName });
                        setPendingChanges(prev => ({
                          ...prev,
                          googleSheets: { spreadsheetId, sheetName }
                        }));
                        debugLogger.info('ClientForm', 'Pending changes updated');
                      }}
                    />
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => {
                          debugLogger.info('ClientForm', 'Save button clicked');
                          debugLogger.info('ClientForm', 'Pending changes:', pendingChanges);
                          const pending = pendingChanges.googleSheets;
                          debugLogger.info('ClientForm', 'GoogleSheets pending:', pending);
                          
                          if (pending && typeof pending === 'object' && 'spreadsheetId' in pending) {
                            debugLogger.info('ClientForm', 'Saving GoogleSheets config:', pending);
                            setGoogleSheetsConfig(pending);
                            setFormData(prev => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                googleSheets: pending.spreadsheetId
                              }
                            }));
                            setGoogleSheetsSuccess(`Configured: ${pending.sheetName}`);
                            window.setTimeout(() => setGoogleSheetsSuccess(null), 3000);
                            debugLogger.info('ClientForm', 'GoogleSheets config saved successfully');
                          } else {
                            debugLogger.info('ClientForm', 'No valid pending changes to save');
                          }
                          setEditingIntegrations(prev => ({ ...prev, googleSheets: false }));
                          setPendingChanges(prev => {
                            const newPending = { ...prev };
                            delete newPending.googleSheets;
                            return newPending;
                          });
                        }}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelEdit('googleSheets')}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      <div className="font-medium text-gray-700">
                        Spreadsheet: {spreadsheetName || 'Loading...'}
                      </div>
                      <div className="text-gray-500 mt-1">
                        Sheet: {googleSheetsConfig?.sheetName || 'No sheet configured'}
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditIntegration('googleSheets')}
                      className="w-full"
                    >
                      Edit
                    </Button>
                  </div>
                )}
                
                {googleSheetsSuccess && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                    {googleSheetsSuccess}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-2">Not connected</p>
                <Link to="/agency" className="text-blue-600 hover:underline text-sm">
                  Connect Google Sheets
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Configuration - Only show in edit mode */}
      {isEdit && (
        <div>
          <Label className="text-sm font-medium">AI Insights</Label>
          <div className="mt-2">
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium">AI-Powered Insights</span>
                </div>
                <Switch
                  checked={aiConfig?.enabled || false}
                  onCheckedChange={handleAIEnabledChange}
                  data-testid="ai-insights-enabled"
                />
              </div>
              
              {aiConfig?.enabled && (
                <div className="mt-3">
                  <Label className="text-xs font-medium text-gray-600">Frequency</Label>
                  <Select
                    value={aiConfig?.frequency || 'weekly'}
                    onValueChange={(value: string) => {
                      debugLogger.info('ClientForm', 'AI frequency Select changed to:', value);
                      if (value === 'daily' || value === 'weekly' || value === 'monthly') {
                        handleAIFrequencyChange(value);
                      }
                    }}
                    data-testid="ai-frequency"
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {submitSuccess && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          {submitSuccess}
        </div>
      )}
      
      {errors.submit && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {errors.submit}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button 
          type="submit" 
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Saving...</span>
            </div>
          ) : (
            isEdit ? 'Update Client' : 'Create Client'
          )}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          className="flex-1"
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
});
