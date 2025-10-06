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
import { GoHighLevelService } from "@/services/api/goHighLevelService";
import { GoogleAdsService } from "@/services/api/googleAdsService";
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';
import { FileUploadService } from "@/services/config/fileUploadService";
import { DatabaseService } from "@/services/data/databaseService";
import { IntegrationPlatform } from "@/types/integration";
import { AlertCircle, Bot, CheckCircle, ExternalLink, ImageIcon, X } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";

// Global type declarations for browser APIs
declare global {
  interface Window {
    URL: typeof URL;
    setTimeout: typeof setTimeout;
  }
}

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
  submitLabel?: string;
  cancelLabel?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  initialData,
  isEdit = false,
  clientId,
  onSubmit,
  onCancel,
  submitLabel = "Save Client",
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

  // Load connected accounts when component mounts
  useEffect(() => {
    console.log('🔍 ClientForm: useEffect called - NOT loading accounts automatically');
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
            const { IntegrationService } = await import('@/services/integration/IntegrationService');
            const isConnected = await IntegrationService.isConnected(platform as IntegrationPlatform);
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

  // Load GoHighLevel locations when needed
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
        console.log('🔍 ClientForm: GoHighLevel OAuth connection found, calling getAllLocations()...');
        const locations = await GoHighLevelService.getAllLocations();
        console.log('🔍 ClientForm: GoHighLevel API response:', locations);
        
        const ghlAccounts = locations.map(location => ({
          id: location.id,
          name: `${location.name} (${location.city}, ${location.state})`,
          platform: 'goHighLevel' as const
        }));
        
        setConnectedAccounts(prev => [...prev, ...ghlAccounts]);
        setGhlAccountsLoaded(true);
        console.log('🔍 ClientForm: GoHighLevel accounts loaded', ghlAccounts.length);
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
    
    setAiConfigLoading(true);
    try {
      const config = await AIInsightsService.getClientAIConfig(clientId);
      setAiConfig(config);
    } catch (error) {
      console.error('Error loading AI config:', error);
    } finally {
      setAiConfigLoading(false);
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
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        setFormData(prev => ({ ...prev, logo_url: logoUrl }));

        console.log('Logo uploaded successfully:', logoUrl);
      } catch (error) {
        console.error('Error uploading logo:', error);
        setErrors({ logo: 'Failed to upload logo. Please try again.' });
      }
    }
  };

  const removeLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
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
      
      // Clear success message after 3 seconds
      setTimeout(() => setSubmitSuccess(null), 3000);

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
    setFormData(prev => {
      if (platform === 'goHighLevel') {
        if (accountId === "none") {
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
          account.platform === 'goHighLevel' && account.id === accountId
        );
        
        if (selectedLocation) {
          return {
            ...prev,
            accounts: {
              ...prev.accounts,
              goHighLevel: {
                locationId: accountId,
                locationName: selectedLocation.name,
                locationToken: undefined // User will need to provide this separately
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
          [platform]: accountId === "none" ? "" : accountId,
        },
      };
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
      console.error('🔍 ClientForm: Failed to disconnect GoHighLevel:', error);
      alert('Failed to disconnect GoHighLevel. Please try again.');
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
        <Label className="text-sm font-medium">Connected Accounts</Label>
        <div className="space-y-3 mt-2">
          {/* Facebook Ads */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
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
            {isIntegrationConnected('facebookAds') ? (
              <div className="space-y-2">
                <SearchableSelect
                  options={[
                    { value: "none", label: "None" },
                    ...getAvailableAccounts('facebookAds').map(account => ({
                      value: account.id,
                      label: account.name
                    }))
                  ]}
                  value={formData.accounts.facebookAds || "none"}
                  onValueChange={(value) => handleAccountSelect("facebookAds", value)}
                  placeholder="Select Facebook Ad Account"
                  searchPlaceholder="Search Facebook accounts..."
                  className="min-w-[400px]"
                  onOpenChange={(open) => {
                    console.log('🔍 Facebook dropdown opened:', open, 'facebookAccountsLoaded:', facebookAccountsLoaded);
                    if (open && !facebookAccountsLoaded && !facebookAccountsLoading) {
                      console.log('🔍 Calling loadFacebookAccounts...');
                      loadFacebookAccounts();
                    }
                  }}
                />
                {facebookAccountsLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <LoadingSpinner size="sm" />
                    <span>Loading Facebook accounts...</span>
                  </div>
                )}
                {facebookAccountsLoaded && !facebookAccountsLoading && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Clear cache first, then refresh
                          await FacebookAdsService.clearAdAccountsCache();
                          setFacebookAccountsLoaded(false);
                          await loadFacebookAccounts(true);
                        } catch (error) {
                          console.error('Failed to refresh Facebook accounts:', error);
                        }
                      }}
                      className="text-xs"
                    >
                      🔄 Refresh Accounts
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          console.log('🔍 Running Facebook accounts debug...');
                          const debugResult = await FacebookAdsService.debugAdAccounts();
                          console.log('🔍 Facebook Debug Results:', debugResult);
                          console.log('🔍 All account names:', debugResult.uniqueAccounts.map(acc => acc.name));
                          console.log('🔍 Looking for "Savanna Rooftop":', debugResult.uniqueAccounts.find(acc => 
                            acc.name?.toLowerCase().includes('savanna') || 
                            acc.name?.toLowerCase().includes('rooftop')
                          ));
                        } catch (error) {
                          console.error('Failed to debug Facebook accounts:', error);
                        }
                      }}
                      className="text-xs"
                    >
                      🔍 Debug Accounts
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          console.log('🔍 Searching for "Savanna Rooftop"...');
                          const searchResults = await FacebookAdsService.searchAdAccountByName('Savanna Rooftop');
                          console.log('🔍 Search Results for "Savanna Rooftop":', searchResults);
                          
                          if (searchResults.length > 0) {
                            console.log('✅ Found "Savanna Rooftop"!', searchResults);
                            alert(`Found "Savanna Rooftop" in ${searchResults.length} location(s):\n${searchResults.map(acc => `${acc.name} (${acc.id}) - Source: ${acc.source}`).join('\n')}`);
                          } else {
                            console.log('❌ "Savanna Rooftop" not found in any accessible accounts');
                            alert('❌ "Savanna Rooftop" not found in any accessible Facebook ad accounts. Check permissions or business manager access.');
                          }
                        } catch (error) {
                          console.error('Failed to search for Savanna Rooftop:', error instanceof Error ? error.message : 'Unknown error');
                          alert('Error searching for account: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                      }}
                      className="text-xs"
                    >
                      🔍 Find "Savanna Rooftop"
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          console.log('🔍 Checking Tulen Agency business manager access...');
                          const tulenAgencyResult = await FacebookAdsService.checkTulenAgencyAccess();
                          console.log('🔍 Tulen Agency Access Results:', tulenAgencyResult);
                          
                          if (tulenAgencyResult.businessFound) {
                            const allAccounts = [...tulenAgencyResult.ownedAccounts, ...tulenAgencyResult.clientAccounts];
                            const savannaAccount = allAccounts.find(acc => 
                              acc.name?.toLowerCase().includes('savanna') || 
                              acc.name?.toLowerCase().includes('rooftop')
                            );
                            
                            let message = `✅ Found Tulen Agency Business Manager!\n\n`;
                            message += `Business: ${tulenAgencyResult.businessInfo.name} (${tulenAgencyResult.businessInfo.id})\n`;
                            message += `Owned Accounts: ${tulenAgencyResult.ownedAccounts.length}\n`;
                            message += `Client Accounts: ${tulenAgencyResult.clientAccounts.length}\n`;
                            message += `Total Accounts: ${tulenAgencyResult.totalAccounts}\n\n`;
                            
                            if (savannaAccount) {
                              message += `🎯 FOUND "Savanna Rooftop"!\n`;
                              message += `Account: ${savannaAccount.name} (${savannaAccount.id})\n`;
                              message += `Status: ${savannaAccount.account_status}`;
                            } else {
                              message += `❌ "Savanna Rooftop" not found in Tulen Agency\n\n`;
                              message += `All accounts:\n${allAccounts.map(acc => `- ${acc.name} (${acc.id})`).join('\n')}`;
                            }
                            
                            alert(message);
                          } else {
                            alert('❌ Tulen Agency business manager not found or not accessible. Check permissions.');
                          }
                        } catch (error) {
                          console.error('Failed to check Tulen Agency access:', error instanceof Error ? error.message : 'Unknown error');
                          alert('Error checking Tulen Agency access: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                      }}
                      className="text-xs"
                    >
                      🏢 Check Tulen Agency
                    </Button>
                    <span className="text-xs text-gray-500">
                      {getAvailableAccounts('facebookAds').length} accounts loaded
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>Facebook Ads not connected</span>
                <Link to="/admin" className="text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
            {/* Conversion Action Selector for Facebook Ads */}
            {isIntegrationConnected('facebookAds') && formData.accounts.facebookAds && formData.accounts.facebookAds !== 'none' && (
              <div className="mt-3">
                <Label className="text-xs font-medium text-gray-600">Conversion Action</Label>
                <Select
                  value={formData.conversionActions.facebookAds || "lead"}
                  onValueChange={(value) => handleConversionActionSelect("facebookAds", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select conversion action" />
                  </SelectTrigger>
                  <SelectContent>
                    {conversionActions.facebookAds?.map((action: any) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.name} ({action.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Google Ads */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
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
            {isIntegrationConnected('googleAds') ? (
              <SearchableSelect
                options={[
                  { value: "none", label: "None" },
                  ...getAvailableAccounts('googleAds').map(account => ({
                    value: account.id,
                    label: account.name
                  }))
                ]}
                value={formData.accounts.googleAds || "none"}
                onValueChange={(value) => handleAccountSelect("googleAds", value)}
                placeholder="Select Google Ads Account"
                searchPlaceholder="Search Google accounts..."
                className="min-w-[400px]"
                onOpenChange={(open) => {
                  console.log('🔍 Google Ads dropdown opened:', open, 'googleAccountsLoaded:', googleAccountsLoaded);
                  if (open && !googleAccountsLoaded) {
                    console.log('🔍 Calling loadGoogleAccounts...');
                    loadGoogleAccounts();
                  }
                }}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>Google Ads not connected</span>
                <Link to="/admin" className="text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
            {/* Conversion Action Selector for Google Ads */}
            {isIntegrationConnected('googleAds') && formData.accounts.googleAds && formData.accounts.googleAds !== 'none' && (
              <div className="mt-3">
                <Label className="text-xs text-gray-600 mb-1 block">Conversion Action</Label>
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
                  placeholder="Select conversion action"
                  searchPlaceholder="Search conversion actions..."
                  className="min-w-[400px]"
                />
              </div>
            )}
          </div>

          {/* GoHighLevel */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
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
            <div className="space-y-2">
              {isIntegrationConnected('goHighLevel') ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>GoHighLevel connected</span>
                  </div>
                  
                  {/* Show connection info */}
                  {typeof formData.accounts.goHighLevel === 'object' && formData.accounts.goHighLevel?.locationId && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      <div className="font-medium">Connected Location:</div>
                      <div>{formData.accounts.goHighLevel.locationName}</div>
                      <div className="text-gray-500 mt-1">
                        Location ID: {formData.accounts.goHighLevel.locationId}
                      </div>
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
                    Disconnect GoHighLevel
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Client-Level Integration</span>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      GoHighLevel is configured per client. Each client connects their own location directly.
                    </p>
                  </div>
                  
                  {/* Connect Location Button */}
                  <ConnectLocationButton 
                    clientId={clientId}
                    onConnected={(locationId) => {
                      console.log('🔍 Location connected:', locationId);
                      // Refresh integration status
                      window.location.reload();
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Google Sheets */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
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
            {isIntegrationConnected('googleSheets') ? (
              <div 
                className="space-y-3"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GoogleSheetsSelector
                  initialSpreadsheetId={googleSheetsConfig?.spreadsheetId}
                  initialSheetName={googleSheetsConfig?.sheetName}
                  onSelectionComplete={(spreadsheetId, sheetName) => {
                    debugLogger.info('ClientForm', 'GoogleSheetsSelector callback triggered', { spreadsheetId, sheetName });
                    try {
                      setGoogleSheetsConfig({ spreadsheetId, sheetName });
                      setFormData(prev => ({
                        ...prev,
                        accounts: {
                          ...prev.accounts,
                          googleSheets: spreadsheetId
                        }
                      }));
                      debugLogger.info('ClientForm', 'Google Sheets configuration updated', {
                        spreadsheetId,
                        sheetName
                      });
                      // Clear any previous errors and show success
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.googleSheets;
                        return newErrors;
                      });
                      setGoogleSheetsSuccess(`Google Sheets configured: ${sheetName}`);
                      // Clear success message after 3 seconds
                      setTimeout(() => setGoogleSheetsSuccess(null), 3000);
                    } catch (error) {
                      debugLogger.error('ClientForm', 'Error updating Google Sheets configuration', error);
                      setErrors(prev => ({ ...prev, googleSheets: 'Failed to save Google Sheets configuration' }));
                    }
                  }}
                />
                {errors.googleSheets && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">{errors.googleSheets}</span>
                    </div>
                  </div>
                )}
                {googleSheetsSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">{googleSheetsSuccess}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>Google Sheets not connected</span>
                <Link to="/admin" className="text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" />
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
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm font-medium">AI-Powered Insights</span>
              </div>
              
              {aiConfigLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <LoadingSpinner size="xs" className="border-purple-600 border-t-purple-600" />
                  Loading AI configuration...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Enable AI Insights</Label>
                      <p className="text-xs text-gray-500">Generate AI-powered insights for this client</p>
                    </div>
                    <Switch
                      checked={aiConfig?.enabled || false}
                      onCheckedChange={handleAIEnabledChange}
                      data-testid="ai-insights-enabled"
                    />
                  </div>
                  
                  {aiConfig?.enabled && (
                    <div>
                      <Label className="text-sm font-medium">Generation Frequency</Label>
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
                      <p className="text-xs text-gray-500 mt-1">
                        AI insights will be generated automatically based on this frequency
                      </p>
                    </div>
                  )}
                  
                  {aiConfig?.lastGenerated && (
                    <div className="text-xs text-gray-500">
                      Last generated: {new Date(aiConfig.lastGenerated).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {submitSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800">{submitSuccess}</span>
          </div>
        </div>
      )}
      
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{errors.submit}</span>
          </div>
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
            submitLabel
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
