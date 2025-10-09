import { ConnectLocationButton } from '@/components/admin/ConnectLocationButton';
import { GoogleSheetsSelector } from '@/components/integration/GoogleSheetsSelector';
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { LogoManager } from "@/components/ui/LogoManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { debugLogger } from '@/lib/debug';
import { AIInsightsConfig, AIInsightsService } from "@/services/ai/aiInsightsService";
import { FacebookAdsService } from "@/services/api/facebookAdsService";
import { GoogleAdsService } from "@/services/api/googleAdsService";
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';
import { FileUploadService } from "@/services/config/fileUploadService";
import { DatabaseService } from "@/services/data/databaseService";
import { IntegrationPlatform } from "@/types/integration";
import { AlertCircle, Bot, CheckCircle, ImageIcon, X } from "lucide-react";
import React, { useEffect, useState } from 'react';
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
  status?: 'active' | 'paused' | 'inactive';
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
  onSubmit: (data: ClientFormData) => Promise<void>;
  onCancel: () => void;
  cancelLabel?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  initialData,
  isEdit = false,
  clientId,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel"
}) => {
  console.log('🔍 ClientForm: Component loaded', { isEdit, clientId, initialData });
  
  const [formData, setFormData] = useState<ClientFormData>(initialData || {
    name: "",
    logo_url: "",
    status: 'active',
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [facebookAccountsLoaded, setFacebookAccountsLoaded] = useState(false);
  const [facebookAccountsLoading, setFacebookAccountsLoading] = useState(false);
  const [googleAccountsLoaded, setGoogleAccountsLoaded] = useState(false);
  const [ghlAccountsLoaded, setGhlAccountsLoaded] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo_url || null);
  const [conversionActions, setConversionActions] = useState<Record<string, unknown[]>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [aiConfig, setAiConfig] = useState<AIInsightsConfig | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<{
    spreadsheetId: string;
    sheetName: string;
  } | null>(null);
  const [googleSheetsSuccess, setGoogleSheetsSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean>>({});
  
  // Edit states for each integration
  const [editingIntegrations, setEditingIntegrations] = useState<Record<string, boolean>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  // Load connected accounts when component mounts
  useEffect(() => {
    console.log('🔍 ClientForm: useEffect called - NOT loading accounts automatically');
    
    // DEBUG: Check environment variables
    console.log('🔍 ClientForm: Environment variables check:');
    console.log('🔍 ClientForm: VITE_GOOGLE_ADS_DEVELOPER_TOKEN:', import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN);
    console.log('🔍 ClientForm: All VITE_ env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
    
    // Don't load accounts automatically - only when user clicks dropdowns
    if (isEdit && clientId) {
      loadAIConfig();
    }
    
    // Check integration status for all platforms
    const checkIntegrationStatus = async () => {
      const platforms = ['facebookAds', 'googleAds', 'goHighLevel', 'googleSheets'];
      const statusPromises = platforms.map(async (platform) => {
        try {
          if (platform === 'googleSheets') {
            // Use the new Google Sheets OAuth service
            const isConnected = await GoogleSheetsOAuthService.getSheetsAuthStatus();
            return { platform, isConnected };
          } else {
            // Use TokenManager for reliable token checking
            const { TokenManager } = await import('@/services/auth/TokenManager');
            const isConnected = await TokenManager.isConnected(platform as IntegrationPlatform);
            return { platform, isConnected };
          }
        } catch (error) {
          console.error(`Error checking ${platform} status:`, error);
          return { platform, isConnected: false };
        }
      });
      
      const results = await Promise.all(statusPromises);
      const statusMap = results.reduce((acc, { platform, isConnected }) => {
        acc[platform] = isConnected;
        return acc;
      }, {} as Record<string, boolean>);
      
      setIntegrationStatus(statusMap);
    };
    
    checkIntegrationStatus();
  }, [isEdit, clientId]);

  // Load accounts for platforms that have account IDs in initial data
  useEffect(() => {
    if (initialData?.accounts) {
      console.log('🔍 ClientForm: Initial data received, checking for account IDs to load', initialData.accounts);
      
      // Load Facebook accounts if we have a Facebook account ID
      if (initialData.accounts.facebookAds && initialData.accounts.facebookAds !== 'none') {
        console.log('🔍 ClientForm: Loading Facebook accounts for existing account ID:', initialData.accounts.facebookAds);
        loadFacebookAccounts();
      }
      
      // Load Google Ads accounts if we have a Google Ads account ID
      if (initialData.accounts.googleAds && initialData.accounts.googleAds !== 'none') {
        console.log('🔍 ClientForm: Loading Google Ads accounts for existing account ID:', initialData.accounts.googleAds);
        loadGoogleAccounts();
      } else if (isIntegrationConnected('googleAds')) {
        // Also load Google Ads accounts if the integration is connected but no account is selected yet
        console.log('🔍 ClientForm: Loading Google Ads accounts for connected integration (no existing account)');
        loadGoogleAccounts();
      }
      
      // Load GHL accounts if we have a GHL account ID
      if (initialData.accounts.goHighLevel && initialData.accounts.goHighLevel !== 'none') {
        console.log('🔍 ClientForm: Loading GHL accounts for existing account ID:', initialData.accounts.goHighLevel);
        
        // If it's a string (location ID), convert it to object format
        if (typeof initialData.accounts.goHighLevel === 'string') {
          console.log('🔍 ClientForm: Converting string GoHighLevel ID to object format');
          setFormData(prev => ({
            ...prev,
            accounts: {
              ...prev.accounts,
              goHighLevel: {
                locationId: initialData.accounts.goHighLevel as string,
                locationName: `Location ${initialData.accounts.goHighLevel}`,
                locationToken: undefined
              }
            }
          }));
        }
        
        loadGHLAccounts();
      }
    }
  }, [initialData]);

  // Load accounts for connected integrations on component mount
  useEffect(() => {
    console.log('🔍 ClientForm: Checking for connected integrations to load accounts');
    
    // Load Google Ads accounts if integration is connected
    if (isIntegrationConnected('googleAds') && !googleAccountsLoaded) {
      console.log('🔍 ClientForm: Loading Google Ads accounts for connected integration');
      loadGoogleAccounts();
    }
    
    // Load Facebook accounts if integration is connected
    if (isIntegrationConnected('facebookAds') && !facebookAccountsLoaded) {
      console.log('🔍 ClientForm: Loading Facebook accounts for connected integration');
      loadFacebookAccounts();
    }
    
    // Load GHL accounts if integration is connected
    if (isIntegrationConnected('goHighLevel') && !ghlAccountsLoaded) {
      console.log('🔍 ClientForm: Loading GHL accounts for connected integration');
      loadGHLAccounts();
    }
  }, []); // Run once on mount

  // Initialize Google Sheets configuration from initial data
  useEffect(() => {
    if (initialData?.googleSheetsConfig) {
      setGoogleSheetsConfig(initialData.googleSheetsConfig);
      debugLogger.info('ClientForm', 'Initialized Google Sheets config from initial data', initialData.googleSheetsConfig);
    }
  }, [initialData]);

  // Load conversion actions when Facebook Ads account changes
  useEffect(() => {
    if (formData.accounts.facebookAds && formData.accounts.facebookAds !== 'none') {
      loadFacebookConversionActions(formData.accounts.facebookAds);
    }
  }, [formData.accounts.facebookAds]);

  // Load conversion actions when Google Ads account changes
  useEffect(() => {
    if (formData.accounts.googleAds && formData.accounts.googleAds !== 'none') {
      loadGoogleConversionActions(formData.accounts.googleAds);
    }
  }, [formData.accounts.googleAds]);

  // Load Facebook Ads accounts when needed
  const loadFacebookAccounts = async (forceRefresh = false) => {
    if (facebookAccountsLoaded && !forceRefresh || facebookAccountsLoading) {
      return;
    }
    
    console.log('🔍 ClientForm: Loading Facebook accounts on demand...', { forceRefresh });
    setFacebookAccountsLoading(true);
    
    try {
      console.log('🔍 ClientForm: Calling FacebookAdsService.getAdAccounts()...');
      const adAccounts = forceRefresh 
        ? await FacebookAdsService.refreshAdAccounts()
        : await FacebookAdsService.getAdAccounts();
      console.log('🔍 ClientForm: Facebook API response:', adAccounts);
      
      const facebookAccounts = adAccounts.map(account => ({
        id: account.id,
        name: `${account.name || 'Facebook Ad Account'} (${account.id})`,
        platform: 'facebookAds' as const
      }));
      
      // Check specifically for Savanna Rooftop in the raw API response
      const savannaInRaw = adAccounts.find(acc => acc.name?.toLowerCase().includes('savanna'));
      if (savannaInRaw) {
        console.log('🎯 FOUND Savanna Rooftop in raw API response:', savannaInRaw);
      } else {
        console.log('❌ Savanna Rooftop NOT found in raw API response');
        console.log('🔍 All raw account names:', adAccounts.map(acc => acc.name));
      }
      
      // Check specifically for Savanna Rooftop in the mapped accounts
      const savannaInMapped = facebookAccounts.find(acc => acc.name?.toLowerCase().includes('savanna'));
      if (savannaInMapped) {
        console.log('🎯 FOUND Savanna Rooftop in mapped accounts:', savannaInMapped);
      } else {
        console.log('❌ Savanna Rooftop NOT found in mapped accounts');
        console.log('🔍 All mapped account names:', facebookAccounts.map(acc => acc.name));
      }
      
      setConnectedAccounts(prev => [
        ...prev.filter(acc => acc.platform !== 'facebookAds'),
        ...facebookAccounts
      ]);
      
      setFacebookAccountsLoaded(true);
      console.log('🔍 ClientForm: Facebook accounts loaded successfully:', facebookAccounts.length);
      console.log('🔍 ClientForm: Available Facebook accounts:', facebookAccounts);
    } catch (error) {
      console.error('🔍 ClientForm: Failed to load Facebook accounts:', error);
      debugLogger.error('ClientForm', 'Failed to load Facebook accounts', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Facebook accounts';
      console.warn('🔍 ClientForm: Facebook accounts loading failed:', errorMessage);
      
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
  };

  // Load Google Ads accounts when needed
  const loadGoogleAccounts = async () => {
    if (googleAccountsLoaded) {
      return;
    }
    
    console.log('🔍 ClientForm: Loading Google Ads accounts on demand...');
    
    try {
      console.log('🔍 ClientForm: Calling GoogleAdsService.getAdAccounts()...');
      const googleAccounts = await GoogleAdsService.getAdAccounts();
      console.log('🔍 ClientForm: Google Ads API response:', googleAccounts);
      
      const accounts = googleAccounts.map(account => ({
        id: account.id,
        name: account.name,
        platform: 'googleAds' as const
      }));
      
      setConnectedAccounts(prev => [...prev, ...accounts]);
      setGoogleAccountsLoaded(true);
      console.log('🔍 ClientForm: Google Ads accounts loaded', accounts.length);
    } catch (error) {
      console.error('🔍 ClientForm: Google Ads error', error);
      // Add error to connected accounts so user knows there was an issue
      setConnectedAccounts(prev => [...prev, {
        id: 'google_error',
        name: 'Error loading Google Ads accounts',
        platform: 'googleAds' as const
      }]);
      setGoogleAccountsLoaded(true);
    }
  };

  // Load GoHighLevel accounts when needed (simplified for location-level OAuth)
  const loadGHLAccounts = async () => {
    if (ghlAccountsLoaded) {
      return;
    }
    
    console.log('🔍 ClientForm: Loading GoHighLevel accounts on demand...');
    
    try {
      console.log('🔍 ClientForm: Getting integrations from database...');
      const integrations = await DatabaseService.getIntegrations();
      console.log('🔍 ClientForm: Integrations from database:', integrations);
      
      const ghlIntegration = integrations.find(i => i.platform === 'goHighLevel');
      console.log('🔍 ClientForm: GoHighLevel integration:', ghlIntegration);
      
      // Check if there's an OAuth connection (not just API key)
      const hasOAuthConnection = ghlIntegration?.config?.apiKey?.keyType === 'bearer' && 
                                 ghlIntegration?.config?.refreshToken;
      
      if (hasOAuthConnection) {
        console.log('🔍 ClientForm: GoHighLevel OAuth connection found');
        setConnectedAccounts(prev => [...prev, {
          id: 'ghl_connected',
          name: 'GoHighLevel Connected',
          platform: 'goHighLevel' as const
        }]);
        setGhlAccountsLoaded(true);
        console.log('🔍 ClientForm: GoHighLevel connection confirmed');
      } else {
        console.log('🔍 ClientForm: GoHighLevel not connected, adding not connected option');
        setConnectedAccounts(prev => [...prev, {
          id: 'ghl_not_connected',
          name: 'GoHighLevel not connected',
          platform: 'goHighLevel' as const
        }]);
        setGhlAccountsLoaded(true);
      }
    } catch (error) {
      console.error('🔍 ClientForm: GoHighLevel error', error);
      // Add error to connected accounts so user knows there was an issue
      setConnectedAccounts(prev => [...prev, {
        id: 'ghl_error',
        name: 'Error loading GoHighLevel locations',
        platform: 'goHighLevel' as const
      }]);
      setGhlAccountsLoaded(true);
    }
  };

  const loadAIConfig = async () => {
    if (!clientId) {
      return;
    }
    
    try {
      const config = await AIInsightsService.getClientAIConfig(clientId);
      setAiConfig(config);
    } catch (error) {
      debugLogger.error('ClientForm', 'Error loading AI config', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ logo: 'Please select a valid image file' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ logo: 'Image size must be less than 5MB' });
        return;
      }

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
        console.error('Error uploading logo:', error);
        setErrors({ logo: 'Failed to upload logo. Please try again.' });
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
          console.error('Error updating AI config:', error);
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
          googleSheets: googleSheetsConfig ? 'google_sheets_account' : 'none'
        },
        googleSheetsConfig: googleSheetsConfig
      };

      debugLogger.info('ClientForm', 'Calling onSubmit with formData', submitData);
      await onSubmit({
        ...submitData,
        googleSheetsConfig: submitData.googleSheetsConfig || undefined
      });

      // Show success message
      setSubmitSuccess(`${isEdit ? 'Client updated' : 'Client created'} successfully!`);
      
      // Clear success message after 2 seconds and close modal
      window.setTimeout(() => {
        setSubmitSuccess(null);
        if (isEdit) {
          onCancel(); // Close the modal
        }
      }, 2000);

    } catch (error) {
      debugLogger.error('ClientForm', 'Form submission failed', error);
      setErrors({ submit: 'Failed to save client. Please try again.' });
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
          if (pendingValue === "none") {
            return {
              ...prev,
              accounts: {
                ...prev.accounts,
                goHighLevel: "none",
              },
            };
          }
          
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
        
        // Default handling for other platforms
        return {
          ...prev,
          accounts: {
            ...prev.accounts,
            [platform]: pendingValue === "none" ? "" : pendingValue,
          },
        };
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
      console.log('🔍 ClientForm: Disconnecting GoHighLevel...');
      
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
      
      console.log('🔍 ClientForm: GoHighLevel disconnected successfully');
      
      // Refresh integration status
      window.location.reload();
    } catch (error) {
      debugLogger.error('ClientForm', 'Failed to disconnect GoHighLevel', error);
      window.alert('Failed to disconnect GoHighLevel. Please try again.');
    }
  };

  const handleConversionActionSelect = (platform: string, actionType: string) => {
    setFormData(prev => ({
      ...prev,
      conversionActions: {
        ...prev.conversionActions,
        [platform]: actionType
      }
    }));
  };

  const loadFacebookConversionActions = async (adAccountId: string) => {
    try {
      const actions = await FacebookAdsService.getConversionActions(adAccountId);
      setConversionActions(prev => ({
        ...prev,
        facebookAds: actions
      }));
    } catch (error) {
      console.error('Failed to load Facebook conversion actions:', error);
    }
  };

  const loadGoogleConversionActions = async (customerId: string) => {
    try {
      const actions = await GoogleAdsService.getConversionActions(customerId);
      setConversionActions(prev => ({
        ...prev,
        googleAds: actions
      }));
    } catch (error) {
      console.error('Failed to load Google Ads conversion actions:', error);
    }
  };

  const getAvailableAccounts = (platform: string) => {
    const accounts = connectedAccounts.filter(account => account.platform === platform);
    console.log(`🔍 ClientForm: getAvailableAccounts(${platform}):`, accounts);
    console.log(`🔍 ClientForm: Total connectedAccounts:`, connectedAccounts.length);
    console.log(`🔍 ClientForm: All connectedAccounts:`, connectedAccounts);
    
    // Check specifically for Savanna Rooftop
    const savannaAccount = accounts.find(acc => acc.name?.toLowerCase().includes('savanna'));
    if (savannaAccount) {
      console.log('🎯 FOUND Savanna Rooftop in getAvailableAccounts:', savannaAccount);
    } else {
      console.log('❌ Savanna Rooftop NOT found in getAvailableAccounts');
    }
    
    return accounts;
  };

  const isIntegrationConnected = (platform: string): boolean => {
    console.log(`🔍 ClientForm: Checking if ${platform} is connected`);
    
    // For GoHighLevel, it's always client-level only - check if client has location configured
    if (platform === 'goHighLevel') {
      const hasLocationId = typeof formData.accounts.goHighLevel === 'string' 
        ? formData.accounts.goHighLevel && formData.accounts.goHighLevel !== 'none'
        : formData.accounts.goHighLevel?.locationId && formData.accounts.goHighLevel?.locationId !== 'none';
      
      console.log(`🔍 ClientForm: GoHighLevel client-level check:`, {
        hasLocationId,
        formData: formData.accounts.goHighLevel
      });
      return Boolean(hasLocationId);
    }
    
    // For other platforms, check admin integration status
    const isConnected = integrationStatus[platform] || false;
    console.log(`🔍 ClientForm: isIntegrationConnected(${platform}) = ${isConnected}`);
    return isConnected;
  };

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

      {isEdit && (
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: 'active' | 'paused' | 'inactive') => 
              setFormData(prev => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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
              {isIntegrationConnected('facebookAds') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {isIntegrationConnected('facebookAds') ? (
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
                        value={(pendingChanges.facebookAds ?? formData.accounts.facebookAds) || "none"}
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
                        <Select
                          value={formData.conversionActions.facebookAds || "lead"}
                          onValueChange={(value) => handleConversionActionSelect("facebookAds", value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {conversionActions.facebookAds?.map((action: any) => (
                              <SelectItem key={action.id} value={action.id}>
                                {action.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                <Link to="/admin" className="text-blue-600 hover:underline text-sm">
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
              {isIntegrationConnected('googleAds') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {isIntegrationConnected('googleAds') ? (
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
                        value={(pendingChanges.googleAds ?? formData.accounts.googleAds) || "none"}
                        onValueChange={(value) => handleAccountSelect("googleAds", value)}
                        placeholder="Select account"
                        searchPlaceholder="Search accounts..."
                        className="mt-1"
                        onOpenChange={(open) => {
                          if (open && !googleAccountsLoaded) {
                            loadGoogleAccounts();
                          }
                        }}
                      />
                    </div>
                    
                    {((pendingChanges.googleAds ?? formData.accounts.googleAds) && 
                     (pendingChanges.googleAds ?? formData.accounts.googleAds) !== 'none') && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Conversion Action</Label>
                        <SearchableSelect
                          options={[
                            { value: "conversions", label: "Conversions" },
                            ...(conversionActions.googleAds || []).map((action: any) => ({
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
                <Link to="/admin" className="text-blue-600 hover:underline text-sm">
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
              {isIntegrationConnected('goHighLevel') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {isIntegrationConnected('goHighLevel') ? (
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
                  onConnected={(_locationId) => {
                    window.location.reload();
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
              {isIntegrationConnected('googleSheets') && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {isIntegrationConnected('googleSheets') ? (
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
                        setPendingChanges(prev => ({
                          ...prev,
                          googleSheets: { spreadsheetId, sheetName }
                        }));
                      }}
                    />
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => {
                          const pending = pendingChanges.googleSheets;
                          if (pending) {
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
                        {googleSheetsConfig?.sheetName || 'No sheet configured'}
                      </div>
                      {googleSheetsConfig?.spreadsheetId && (
                        <div className="text-gray-500 mt-1">
                          ID: {googleSheetsConfig.spreadsheetId}
                        </div>
                      )}
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
                <Link to="/admin" className="text-blue-600 hover:underline text-sm">
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
                    onValueChange={handleAIFrequencyChange}
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
              <LoadingSpinner size="sm" />
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
};
