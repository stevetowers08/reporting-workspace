import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { debugLogger } from '@/lib/debug';
import { AIInsightsConfig, AIInsightsService } from "@/services/ai/aiInsightsService";
import { FacebookAdsService } from "@/services/api/facebookAdsService";
import { GoogleAdsService } from "@/services/api/googleAdsService";
import { FileUploadService } from "@/services/config/fileUploadService";
import { DatabaseService } from "@/services/data/databaseService";
import { AlertCircle, Bot, ExternalLink, ImageIcon, X } from "lucide-react";
import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";

interface ConnectedAccount {
  id: string;
  name: string;
  platform: string;
}

interface ClientFormData {
  name: string;
  logo_url: string;
  status?: 'active' | 'paused' | 'inactive';
  accounts: {
    facebookAds: string;
    googleAds: string;
    goHighLevel: string;
    googleSheets: string;
  };
  conversionActions: {
    facebookAds: string;
    googleAds: string;
  };
}

interface ClientFormProps {
  initialData?: ClientFormData;
  isEdit?: boolean;
  clientId?: string;
  onSubmit: (data: ClientFormData) => void;
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
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logo_url || null);
  const [conversionActions, setConversionActions] = useState<Record<string, any[]>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [aiConfig, setAiConfig] = useState<AIInsightsConfig | null>(null);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);

  // Load connected accounts when component mounts
  useEffect(() => {
    loadConnectedAccounts();
    if (isEdit && clientId) {
      loadAIConfig();
    }
  }, [isEdit, clientId]);

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

  const loadConnectedAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const accounts: ConnectedAccount[] = [];

      // Get integration status from database
      const integrations = await DatabaseService.getIntegrations();

      // Check Facebook Ads - always available with Marketing API token
      try {
        debugLogger.debug('ClientForm', 'Loading Facebook ad accounts');
        const adAccounts = await FacebookAdsService.getAdAccounts();
        debugLogger.debug('ClientForm', 'Loaded Facebook ad accounts', { count: adAccounts.length, accounts: adAccounts });
        adAccounts.forEach(account => {
          accounts.push({
            id: account.id,
            name: `${account.name || 'Facebook Ad Account'} (${account.id})`,
            platform: 'facebookAds'
          });
        });
        debugLogger.debug('ClientForm', 'Processed Facebook accounts for UI', { count: accounts.filter(a => a.platform === 'facebookAds').length });
      } catch (error) {
        debugLogger.error('ClientForm', 'Failed to load Facebook ad accounts', error);
      }

      // Check Google Ads
      try {
        const googleAccounts = await GoogleAdsService.getAdAccounts();
        accounts.push(...googleAccounts.map(account => ({
          id: account.id,
          name: account.name,
          platform: 'googleAds'
        })));
        console.log('Processed Google Ads accounts for UI:', googleAccounts.length);
      } catch (error) {
        console.error('Failed to load Google Ads accounts:', error);
      }

      // Check GoHighLevel
      const ghlIntegration = integrations.find(i => i.platform === 'goHighLevel');
      if (ghlIntegration?.connected) {
        accounts.push({
          id: 'ghl_location',
          name: ghlIntegration.account_name || 'GoHighLevel Location',
          platform: 'goHighLevel'
        });
      }

      // Check Google Sheets
      const sheetsIntegration = integrations.find(i => i.platform === 'googleSheets');
      if (sheetsIntegration?.connected) {
        accounts.push({
          id: 'google_sheets_account',
          name: sheetsIntegration.account_name || 'Google Sheets Account',
          platform: 'googleSheets'
        });
      }

      console.log('Total connected accounts loaded:', accounts.length);
      setConnectedAccounts(accounts);
    } catch (error) {
      console.error('Error loading connected accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadAIConfig = async () => {
    if (!clientId) return;
    
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

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Client name is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Update AI config if it exists and we're editing
    if (isEdit && clientId && aiConfig) {
      try {
        await AIInsightsService.createOrUpdateClientAIConfig(clientId, {
          enabled: aiConfig.enabled,
          frequency: aiConfig.frequency
        });
      } catch (error) {
        console.error('Error updating AI config:', error);
      }
    }

    onSubmit(formData);
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
    setFormData(prev => ({
      ...prev,
      accounts: {
        ...prev.accounts,
        [platform]: accountId === "none" ? "" : accountId,
      },
    }));
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
    return connectedAccounts.filter(account => account.platform === platform);
  };

  const isIntegrationConnected = (platform: string) => {
    if (platform === 'facebookAds') {
      return true; // Facebook Ads is always available with Marketing API token
    }
    if (platform === 'googleAds') {
      return true; // Google Ads is available with OAuth token
    }
    return connectedAccounts.some(account => account.platform === platform);
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
              <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">f</span>
              </div>
              <span className="text-sm font-medium">Facebook Ads</span>
            </div>
            {isIntegrationConnected('facebookAds') ? (
              loadingAccounts ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <LoadingSpinner size="xs" />
                  Loading Facebook ad accounts...
                </div>
              ) : (
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
                />
              )
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
                    {conversionActions.facebookAds?.map(action => (
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
              <div className="w-4 h-4 bg-red-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">G</span>
              </div>
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
                    ...(conversionActions.googleAds || []).map(action => ({
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
              <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">G</span>
              </div>
              <span className="text-sm font-medium">GoHighLevel CRM</span>
            </div>
            {isIntegrationConnected('goHighLevel') ? (
              <Select
                value={formData.accounts.goHighLevel || "none"}
                onValueChange={(value) => handleAccountSelect("goHighLevel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select GoHighLevel Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableAccounts('goHighLevel').map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>GoHighLevel not connected</span>
                <Link to="/admin" className="text-blue-600 hover:underline">
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Google Sheets */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">S</span>
              </div>
              <span className="text-sm font-medium">Google Sheets</span>
            </div>
            {isIntegrationConnected('googleSheets') ? (
              <Select
                value={formData.accounts.googleSheets || "none"}
                onValueChange={(value) => handleAccountSelect("googleSheets", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Google Sheets Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableAccounts('googleSheets').map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
};
