import React, { useState, useEffect, useRef } from 'react';
import { ConnectLocationButton } from '@/components/agency/ConnectLocationButton';
import { GoogleSheetsSelector } from '@/components/integration/GoogleSheetsSelector';
import { LogoManager } from "@/components/ui/LogoManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/lib/supabase';
import { AIInsightsService } from "@/services/ai/aiInsightsService";
import { FacebookAdsService } from "@/services/api/facebookAdsService";
import { GoogleAdsService } from "@/services/api/googleAdsService";
import { AlertCircle, Bot, CheckCircle, Edit, Upload, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

interface Client {
    id: string;
    name: string;
    logo_url?: string;
    accounts: {
        facebookAds?: string;
        googleAds?: string;
        goHighLevel?: string;
        googleSheets?: string;
        googleSheetsConfig?: {
            spreadsheetId: string;
            sheetName: string;
            spreadsheetName?: string;
        };
    };
    shareable_link: string;
    conversion_actions?: {
        facebookAds?: string;
        googleAds?: string;
    };
}

interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
    onCreateClient?: (clientData: Record<string, unknown>) => Promise<void>;
    client: Client | null;
}

const EditClientModal = ({ isOpen, onClose, onUpdateClient, onCreateClient, client }: EditClientModalProps) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [_isEditingLogo, _setIsEditingLogo] = useState(false);
    const [clientName, setClientName] = useState(client?.name || '');
    const [clientLogo, setClientLogo] = useState(client?.logo_url || '');
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    
    // Integration state
    const [formData, setFormData] = useState({
        name: clientName,
        logo_url: clientLogo,
            accounts: {
            facebookAds: client?.accounts?.facebookAds || 'none',
            googleAds: client?.accounts?.googleAds || 'none',
            goHighLevel: client?.accounts?.goHighLevel || 'none',
            googleSheets: client?.accounts?.googleSheets || 'none',
        },
        conversionActions: {
            facebookAds: client?.conversion_actions?.facebookAds || '',
            googleAds: client?.conversion_actions?.googleAds || '',
        },
        googleSheetsConfig: client?.accounts?.googleSheetsConfig || null,
    });
    
    // Debug form data
    console.log('🔍 EditClientModal: Form data initialized:', formData);
    console.log('🔍 EditClientModal: Client data:', client);
    
    const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean>>({
        facebookAds: false,
        googleAds: false,
        googleSheets: false,
        goHighLevel: false
    });
    
    // Debug integration status
    console.log('🔍 EditClientModal: Initial integration status:', integrationStatus);
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
    const [facebookAccountsLoaded, setFacebookAccountsLoaded] = useState(false);
    const [facebookAccountsLoading, setFacebookAccountsLoading] = useState(false);
    const [googleAccountsLoaded, setGoogleAccountsLoaded] = useState(false);
    const [googleAccountsLoading, setGoogleAccountsLoading] = useState(false);
    const [facebookConversionActions, setFacebookConversionActions] = useState<any[]>([]);
    const [googleConversionActions, setGoogleConversionActions] = useState<any[]>([]);
    const [loadingConversionActions, setLoadingConversionActions] = useState<Record<string, boolean>>({});
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isEditingSheets, setIsEditingSheets] = useState(false);

    // Reset editing state when client changes
    useEffect(() => {
        setIsEditingSheets(false);
    }, [client?.id]);

    // Load integration status
    useEffect(() => {
        const loadIntegrationStatus = async () => {
            try {
                const { data: integrations } = await supabase
                    .from('integrations')
                    .select('platform, connected, config')
                    .eq('connected', true);

                const statusMap: Record<string, boolean> = { 
                    facebookAds: false, 
                    googleAds: false, 
                    googleSheets: false,
                    goHighLevel: false
                };

                integrations?.forEach(integration => {
                    if (statusMap.hasOwnProperty(integration.platform)) {
                        statusMap[integration.platform] = true;
                    }
                });

                console.log('🔍 EditClientModal: Integration status loaded:', statusMap);
                console.log('🔍 EditClientModal: Raw integrations data:', integrations);
                console.log('🔍 EditClientModal: Facebook Ads connected:', statusMap.facebookAds);
                console.log('🔍 EditClientModal: Google Ads connected:', statusMap.googleAds);
                setIntegrationStatus(statusMap);
            } catch (error) {
                console.error('Error loading integration status', error);
            }
        };

        loadIntegrationStatus();
    }, []);

    // Load AI config for edit mode
    useEffect(() => {
        if (client?.id) {
            AIInsightsService.getClientAIConfig(client.id)
                .then(setAiConfig)
                .catch(() => setAiConfig(null));
        }
    }, [client?.id]);

    // Load Facebook conversion actions when account is selected
    useEffect(() => {
        if (formData.accounts.facebookAds && formData.accounts.facebookAds !== 'none') {
            loadFacebookConversionActions(formData.accounts.facebookAds);
        } else {
            setFacebookConversionActions([]);
        }
    }, [formData.accounts.facebookAds]);

    // Load Google conversion actions when account is selected
    useEffect(() => {
        if (formData.accounts.googleAds && formData.accounts.googleAds !== 'none') {
            loadGoogleConversionActions(formData.accounts.googleAds);
        } else {
            setGoogleConversionActions([]);
        }
    }, [formData.accounts.googleAds]);

    // Load accounts when integration status changes
    useEffect(() => {
        if (integrationStatus.facebookAds && !facebookAccountsLoaded && !facebookAccountsLoading) {
            loadFacebookAccounts();
        }
        if (integrationStatus.googleAds && !googleAccountsLoaded && !googleAccountsLoading) {
            loadGoogleAccounts();
        }
    }, [integrationStatus.facebookAds, integrationStatus.googleAds, facebookAccountsLoaded, facebookAccountsLoading, googleAccountsLoaded, googleAccountsLoading]);

    // Get available accounts for a platform
    const getAvailableAccounts = (platform: string) => {
        // First try to get accounts from connectedAccounts state
        const accounts = connectedAccounts.filter(acc => acc.platform === platform);
        
        // If no accounts in state, try to get them from integration config
        if (accounts.length === 0) {
            // For Facebook Ads, get accounts from the integration config
            if (platform === 'facebookAds' && integrationStatus.facebookAds) {
                // We need to get the Facebook integration config from the database
                // For now, let's trigger the account loading
                if (!facebookAccountsLoaded && !facebookAccountsLoading) {
                    loadFacebookAccounts();
                }
            }
            
            // For Google Ads, get accounts from the integration config
            if (platform === 'googleAds' && integrationStatus.googleAds) {
                if (!googleAccountsLoaded && !googleAccountsLoading) {
                    loadGoogleAccounts();
                }
            }
        }
        
        // Add current account if it's not in the list
        const currentAccountId = formData.accounts[platform as keyof typeof formData.accounts];
        if (currentAccountId && currentAccountId !== 'none' && !accounts.find(acc => acc.id === currentAccountId)) {
            accounts.unshift({
                id: currentAccountId,
                name: `${platform === 'googleAds' ? 'Google Ads' : platform === 'facebookAds' ? 'Facebook Ads' : platform} Account (${currentAccountId})`,
                platform
            });
        }
        
        return accounts;
    };

    // Load Facebook Ads accounts
    const loadFacebookAccounts = async () => {
        if (facebookAccountsLoaded || facebookAccountsLoading) {
            return;
        }
        
        setFacebookAccountsLoading(true);
        try {
            // Use refreshAdAccounts to bypass cache and get fresh data
            const accounts = await FacebookAdsService.refreshAdAccounts();
            
            const facebookAccounts = accounts.map(account => ({
                id: account.id,
                name: `${account.name || 'Facebook Ad Account'} (${account.id})`,
                platform: 'facebookAds' as const
            }));
            
            setConnectedAccounts(prev => {
                const filtered = prev.filter(acc => acc.platform !== 'facebookAds');
                return [...filtered, ...facebookAccounts];
            });
            
            setFacebookAccountsLoaded(true);
        } catch (error) {
            console.error('Error loading Facebook accounts:', error);
            // Fallback to cached accounts
            try {
                const cachedAccounts = await FacebookAdsService.getAdAccounts();
                
                const facebookAccounts = cachedAccounts.map(account => ({
                    id: account.id,
                    name: `${account.name || 'Facebook Ad Account'} (${account.id})`,
                    platform: 'facebookAds' as const
                }));
                
                setConnectedAccounts(prev => [
                    ...prev.filter(acc => acc.platform !== 'facebookAds'),
                    ...facebookAccounts
                ]);
                
                setFacebookAccountsLoaded(true);
            } catch (fallbackError) {
                console.error('Error loading cached Facebook accounts:', fallbackError);
            }
        } finally {
            setFacebookAccountsLoading(false);
        }
    };

    // Load Google Ads accounts
    const loadGoogleAccounts = async () => {
        if (googleAccountsLoaded || googleAccountsLoading) {
            return;
        }
        
        setGoogleAccountsLoading(true);
        try {
            const accounts = await GoogleAdsService.getAdAccounts();
            
            const googleAccounts = accounts.map(account => ({
                id: account.id,
                name: account.name,
                platform: 'googleAds' as const
            }));
            
            setConnectedAccounts(prev => {
                const filtered = prev.filter(acc => acc.platform !== 'googleAds');
                return [...filtered, ...googleAccounts];
            });
            
            setGoogleAccountsLoaded(true);
        } catch (error) {
            console.error('Error loading Google accounts:', error);
        } finally {
            setGoogleAccountsLoading(false);
        }
    };

    // Load Facebook Ads conversion actions
    const loadFacebookConversionActions = async (accountId: string) => {
        if (loadingConversionActions.facebookAds) return;
        
        setLoadingConversionActions(prev => ({ ...prev, facebookAds: true }));
        try {
            const actions = await FacebookAdsService.getConversionActions(accountId);
            setFacebookConversionActions(actions);
        } catch (error) {
            console.error('Error loading Facebook conversion actions:', error);
            // Fallback to hardcoded actions
            setFacebookConversionActions([
                { id: 'lead', name: 'Lead' },
                { id: 'purchase', name: 'Purchase' },
                { id: 'add_to_cart', name: 'Add to Cart' }
            ]);
        } finally {
            setLoadingConversionActions(prev => ({ ...prev, facebookAds: false }));
        }
    };

    // Load Google Ads conversion actions
    const loadGoogleConversionActions = async (accountId: string) => {
        if (loadingConversionActions.googleAds) return;
        
        setLoadingConversionActions(prev => ({ ...prev, googleAds: true }));
        try {
            const actions = await GoogleAdsService.getConversionActions(accountId);
            setGoogleConversionActions(actions);
        } catch (error) {
            console.error('Error loading Google conversion actions:', error);
            // Fallback to common Google Ads conversion actions
            setGoogleConversionActions([
                { id: 'conversions', name: 'Conversions' },
                { id: 'leads', name: 'Leads' },
                { id: 'purchase', name: 'Purchase' },
                { id: 'sign_up', name: 'Sign Up' },
                { id: 'add_to_cart', name: 'Add to Cart' },
                { id: 'page_view', name: 'Page View' },
                { id: 'phone_call', name: 'Phone Call' },
                { id: 'email_signup', name: 'Email Signup' }
            ]);
        } finally {
            setLoadingConversionActions(prev => ({ ...prev, googleAds: false }));
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const clientData = {
                name: clientName,
                logo_url: clientLogo,
                accounts: formData.accounts,
                conversion_actions: formData.conversionActions,
                googleSheetsConfig: formData.googleSheetsConfig,
            };
        
        if (client) {
            await onUpdateClient(client.id, clientData);
        } else if (onCreateClient) {
            await onCreateClient(clientData);
            }
            onClose();
        } catch (error) {
            console.error('Error saving client', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAIConfigSave = async () => {
        if (!client?.id || !aiConfig) return;
        
        try {
            await AIInsightsService.createOrUpdateClientAIConfig(client.id, aiConfig);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('Error saving AI config', error);
        }
    };

    const handleNameSave = () => {
        setIsEditingName(false);
        setFormData(prev => ({ ...prev, name: clientName }));
    };

    const handleNameKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNameSave();
        if (e.key === 'Escape') {
            setClientName(client?.name || '');
            setIsEditingName(false);
        }
    };

    const handleLogoSave = () => {
        setIsEditingLogo(false);
        setFormData(prev => ({ ...prev, logo_url: clientLogo }));
    };

    const _handleLogoKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleLogoSave();
        if (e.key === 'Escape') {
            setClientLogo(client?.logo_url || '');
            setIsEditingLogo(false);
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            // Create a temporary URL for preview
            const tempUrl = URL.createObjectURL(file);
            setClientLogo(tempUrl);
            
            // Here you would typically upload to your storage service
            // For now, we'll just use the temp URL
            console.log('File selected:', file.name);
        } catch (error) {
            console.error('Error uploading logo:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Compact Header */}
                <CardHeader className="py-3 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Editable Logo */}
                            <div className="relative">
                                <div 
                                    className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {clientLogo ? (
                                        <img 
                                            src={clientLogo} 
                                            alt="Logo" 
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    ) : (
                                        <Upload className="h-4 w-4 text-white" />
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                            </div>
                            
                            {/* Editable Name */}
                            <div className="flex-1">
                                {isEditingName ? (
                                    <Input
                                        value={clientName}
                                        onChange={(e) => setClientName(e.target.value)}
                                        onBlur={handleNameSave}
                                        onKeyDown={handleNameKeyPress}
                                        className="text-lg font-semibold border-0 p-0 h-auto bg-transparent focus:ring-0"
                                        autoFocus
                                    />
                                ) : (
                                    <CardTitle 
                                        className="text-lg font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => setIsEditingName(true)}
                                    >
                                        {clientName || 'New Client'}
                                </CardTitle>
                                )}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                
                <CardContent className="p-0 flex-1 overflow-y-auto">
                    {/* Modern 2-Column Integration Layout */}
                    <div className="p-4 space-y-6">
                        {/* Integration Cards - 2 per row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Facebook Ads */}
                            <Card className="border-slate-200 hover:border-slate-300 transition-colors h-48">
                                <CardContent className="p-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <LogoManager 
                                                platform="meta" 
                                                size={32} 
                                                context="client-form"
                                                className="text-blue-600"
                                            />
                                            <span className="text-base font-medium text-slate-700">Facebook Ads</span>
                                        </div>
                                        {integrationStatus.facebookAds && formData.accounts.facebookAds !== 'none' && (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                    
                                    {integrationStatus.facebookAds ? (
                                        <div className="space-y-2">
                                            <div className="mt-3">
                                                <SearchableSelect
                                                    options={[
                                                        { value: "none", label: "None" },
                                                        ...getAvailableAccounts('facebookAds').map((account) => ({
                                                            value: account.id,
                                                            label: account.name.replace(/\s*\([^)]*\)$/, '') // Remove account ID in brackets
                                                        }))
                                                    ]}
                                                    value={formData.accounts.facebookAds}
                                                    onValueChange={(value) => setFormData(prev => ({
                                                        ...prev,
                                                        accounts: { ...prev.accounts, facebookAds: value }
                                                    }))}
                                                    placeholder="Select account"
                                                    searchPlaceholder="Search Facebook accounts..."
                                                    size="sm"
                                                    className="w-full focus:ring-0 focus:ring-offset-0"
                                                    onOpenChange={(open) => {
                                                        if (open && !facebookAccountsLoaded && !facebookAccountsLoading) {
                                                                loadFacebookAccounts();
                                                            }
                                                        }}
                                                />
                                            </div>
                                            
                                            {formData.accounts.facebookAds !== 'none' && (
                                                <div className="mt-2">
                                                    <SearchableSelect
                                                        options={facebookConversionActions.map((action) => ({
                                                            value: action.id,
                                                            label: action.name
                                                        }))}
                                                        value={formData.conversionActions.facebookAds}
                                                        onValueChange={(value) => setFormData(prev => ({
                                                            ...prev,
                                                            conversionActions: { ...prev.conversionActions, facebookAds: value }
                                                        }))}
                                                        placeholder="Select action"
                                                        searchPlaceholder="Search conversion actions..."
                                                            className="w-full h-8 text-sm focus:ring-0 focus:ring-offset-0"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-3">
                                            <AlertCircle className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                                            <p className="text-sm text-slate-500 mb-1">Not connected</p>
                                            <Link to="/agency" className="text-blue-600 hover:underline text-sm">
                                                Connect Facebook Ads
                                            </Link>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Google Ads */}
                            <Card className="border-slate-200 hover:border-slate-300 transition-colors h-48">
                                <CardContent className="p-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <LogoManager 
                                                platform="googleAds" 
                                                size={32} 
                                                context="client-form"
                                                className="text-red-600"
                                            />
                                            <span className="text-base font-medium text-slate-700">Google Ads</span>
                                        </div>
                                        {integrationStatus.googleAds && formData.accounts.googleAds !== 'none' && (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                    
                                    {integrationStatus.googleAds ? (
                                        <div className="space-y-2">
                                            <div className="mt-3">
                                                <SearchableSelect
                                                    options={[
                                                        { value: "none", label: "None" },
                                                        ...getAvailableAccounts('googleAds').map((account) => ({
                                                            value: account.id,
                                                            label: account.name
                                                        }))
                                                    ]}
                                                    value={formData.accounts.googleAds}
                                                    onValueChange={(value) => setFormData(prev => ({
                                                        ...prev,
                                                        accounts: { ...prev.accounts, googleAds: value }
                                                    }))}
                                                    placeholder="Select account"
                                                    searchPlaceholder="Search Google accounts..."
                                                        className="w-full h-8 text-sm focus:ring-0 focus:ring-offset-0"
                                                    onOpenChange={(open) => {
                                                        if (open && !googleAccountsLoaded && !googleAccountsLoading) {
                                                                loadGoogleAccounts();
                                                            }
                                                        }}
                                                />
                                            </div>
                                            
                                            {formData.accounts.googleAds !== 'none' && (
                                                <div className="mt-2">
                                                    <SearchableSelect
                                                        options={googleConversionActions.map((action) => ({
                                                            value: action.id,
                                                            label: action.name
                                                        }))}
                                                        value={formData.conversionActions.googleAds}
                                                        onValueChange={(value) => setFormData(prev => ({
                                                            ...prev,
                                                            conversionActions: { ...prev.conversionActions, googleAds: value }
                                                        }))}
                                                        placeholder="Select action"
                                                        searchPlaceholder="Search conversion actions..."
                                                            className="w-full h-8 text-sm focus:ring-0 focus:ring-offset-0"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-3">
                                            <AlertCircle className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                                            <p className="text-sm text-slate-500 mb-1">Not connected</p>
                                            <Link to="/agency" className="text-blue-600 hover:underline text-sm">
                                                Connect Google Ads
                                            </Link>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* GoHighLevel */}
                            <Card className="border-slate-200 hover:border-slate-300 transition-colors h-48">
                                <CardContent className="p-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <LogoManager 
                                                platform="goHighLevel" 
                                                size={32} 
                                                context="client-form"
                                                className="text-purple-600"
                                            />
                                            <span className="text-base font-medium text-slate-700">GoHighLevel</span>
                                        </div>
                                        {formData.accounts.goHighLevel !== 'none' && (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                    
                                    {formData.accounts.goHighLevel !== 'none' ? (
                                        <div className="space-y-2">
                                            <div className="mt-3">
                                                <div className="bg-slate-50 p-2 rounded text-sm">
                                                <div className="font-medium text-slate-700">Connected</div>
                                                <div className="text-slate-500">Location configured</div>
                                            </div>
                                            </div>
                                            
                                            <div className="mt-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    accounts: { ...prev.accounts, goHighLevel: 'none' }
                                                }))}
                                                className="w-full h-8"
                                            >
                                                Disconnect
                                            </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <ConnectLocationButton 
                                                clientId={client?.id || 'new_client'}
                                                onConnected={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        accounts: { ...prev.accounts, goHighLevel: 'connected' }
                                                    }));
                                                }}
                                            />
                                </div>
                            )}
                                </CardContent>
                            </Card>

                            {/* Google Sheets */}
                            <Card className="border-slate-200 hover:border-slate-300 transition-colors h-48">
                                <CardContent className="p-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <LogoManager 
                                                platform="googleSheets" 
                                                size={32} 
                                                context="client-form"
                                                className="text-green-600"
                                            />
                                            <span className="text-base font-medium text-slate-700">Google Sheets</span>
                                        </div>
                                        {integrationStatus.googleSheets && formData.googleSheetsConfig && (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                    
                                    {integrationStatus.googleSheets ? (
                                        <div className="space-y-2 overflow-hidden">
                                            {formData.googleSheetsConfig && !isEditingSheets ? (
                                                <div className="bg-slate-50 p-2 rounded text-xs relative mt-3">
                                                    <div className="font-medium text-slate-700">
                                                        {formData.googleSheetsConfig.spreadsheetName || 'Configured Spreadsheet'}
                                                    </div>
                                                    <div className="text-slate-500">
                                                        Sheet: {formData.googleSheetsConfig.sheetName || 'Configured Sheet'}
                                                    </div>
                                                    <button
                                                        onClick={() => setIsEditingSheets(true)}
                                                        className="absolute top-1 right-1 p-1 hover:bg-slate-200 rounded transition-colors"
                                                    >
                                                        <Edit className="h-3 w-3 text-slate-500" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <GoogleSheetsSelector
                                                    initialSpreadsheetId={formData.googleSheetsConfig?.spreadsheetId || ""}
                                                    initialSheetName={formData.googleSheetsConfig?.sheetName || ""}
                                                    hideSaveButton={true}
                                                    onSelectionComplete={(spreadsheetId, sheetName, spreadsheetName) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            googleSheetsConfig: { 
                                                                spreadsheetId, 
                                                                sheetName,
                                                                spreadsheetName: spreadsheetName || 'Unknown Spreadsheet'
                                                            }
                                                        }));
                                                        setIsEditingSheets(false);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-3">
                                            <AlertCircle className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                                            <p className="text-sm text-slate-500 mb-1">Not connected</p>
                                            <Link to="/agency" className="text-blue-600 hover:underline text-sm">
                                                Connect Google Sheets
                                            </Link>
                                </div>
                            )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* AI Insights - Only in edit mode */}
                        {client && (
                            <Card className="border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                                                <Bot className="h-5 w-5 text-white" />
                                            </div>
                                            <span className="text-base font-medium text-slate-700">AI Insights</span>
                                        </div>
                                        <Switch
                                            checked={aiConfig?.enabled || false}
                                            onCheckedChange={(enabled) => {
                                                if (aiConfig) {
                                                    setAiConfig(prev => prev ? { ...prev, enabled } : null);
                                                } else {
                                                    setAiConfig({
                                                        id: '',
                                                        clientId: client.id,
                                                        enabled,
                                                        frequency: 'weekly',
                                                        createdAt: new Date().toISOString(),
                                                        updatedAt: new Date().toISOString()
                                                    });
                                                }
                                            }}
                                        />
                                    </div>
                                    
                                    {aiConfig?.enabled && (
                                        <div className="mt-3 space-y-3">
                                            <div>
                                                <Label className="text-xs text-slate-600">Frequency</Label>
                                                <Select
                                                    value={aiConfig?.frequency || 'weekly'}
                                                    onValueChange={(frequency) => {
                                                        setAiConfig(prev => prev ? { ...prev, frequency } : null);
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    <SelectTrigger 
                                                        className="mt-1 h-8"
                                                        onFocus={(e) => e.preventDefault()}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <SelectValue placeholder="Select frequency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            {hasUnsavedChanges && (
                                                <div className="flex gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        onClick={handleAIConfigSave}
                                                        className="h-7 text-xs"
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => {
                                                            setHasUnsavedChanges(false);
                                                            // Reset to original config
                                                            if (client?.id) {
                                                                AIInsightsService.getClientAIConfig(client.id)
                                                                    .then(setAiConfig)
                                                                    .catch(() => setAiConfig(null));
                                                            }
                                                        }}
                                                        className="h-7 text-xs"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Save/Cancel Buttons */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : (client ? 'Update Client' : 'Create Client')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default EditClientModal;