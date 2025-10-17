import { ClientForm } from "@/components/agency/ClientForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debugLogger } from '@/lib/debug';
import { Building2, Link, Settings, X } from "lucide-react";

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
        };
    };
    status: 'active' | 'paused' | 'inactive';
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
    onCreateClient?: (clientData: any) => Promise<void>;
    client: Client | null;
}

const EditClientModal = ({ isOpen, onClose, onUpdateClient, onCreateClient, client }: EditClientModalProps) => {
    const handleSubmit = async (formData: any) => {
        console.log('🔍 EditClientModal: handleSubmit called with:', formData);
        console.log('🔍 EditClientModal: formData.googleSheetsConfig:', formData.googleSheetsConfig);
        console.log('🔍 EditClientModal: formData.accounts.googleSheets:', formData.accounts.googleSheets);
        
        debugLogger.info('EditClientModal', 'handleSubmit called', { formData, clientId: client?.id, isCreating: !client });
        
        // Transform form data to match expected format
        const clientData = {
            name: formData.name,
            logo_url: formData.logo_url,
            status: formData.status,
            accounts: {
                facebookAds: formData.accounts.facebookAds,
                googleAds: formData.accounts.googleAds,
                goHighLevel: formData.accounts.goHighLevel,
                googleSheets: formData.accounts.googleSheets,
                googleSheetsConfig: formData.googleSheetsConfig,
            },
            conversion_actions: {
                facebookAds: formData.conversionActions.facebookAds,
                googleAds: formData.conversionActions.googleAds,
            }
        };
        
        console.log('🔍 EditClientModal: Transformed clientData:', clientData);
        console.log('🔍 EditClientModal: clientData.accounts.googleSheetsConfig:', clientData.accounts.googleSheetsConfig);
        
        if (client) {
            await onUpdateClient(client.id, clientData);
            onClose(); // Close the modal after successful update
        } else if (onCreateClient) {
            await onCreateClient(clientData);
            onClose(); // Close the modal after successful creation
        }
    };

    if (!isOpen) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'paused': return 'bg-yellow-100 text-yellow-800';
            case 'inactive': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getConnectedIntegrations = () => {
        const integrations = [];
        if (client?.accounts?.facebookAds && client.accounts.facebookAds !== 'none') {
            integrations.push({ name: 'Facebook Ads', icon: '📘', color: 'bg-blue-100 text-blue-800' });
        }
        if (client?.accounts?.googleAds && client.accounts.googleAds !== 'none') {
            integrations.push({ name: 'Google Ads', icon: '🔍', color: 'bg-red-100 text-red-800' });
        }
        if (client?.accounts?.goHighLevel && client.accounts.goHighLevel !== 'none') {
            integrations.push({ name: 'GoHighLevel', icon: '🏢', color: 'bg-purple-100 text-purple-800' });
        }
        if (client?.accounts?.googleSheets && client.accounts.googleSheets !== 'none') {
            integrations.push({ name: 'Google Sheets', icon: '📊', color: 'bg-green-100 text-green-800' });
        }
        return integrations;
    };

    const connectedIntegrations = getConnectedIntegrations();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-semibold">
                                    {client ? `Edit ${client.name}` : 'Create New Client'}
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-1">
                                    Manage client settings and integrations
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {client && (
                        <div className="flex items-center space-x-4 pt-2 border-t">
                            <div className="flex items-center space-x-2">
                                <Badge className={getStatusColor(client.status)}>
                                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                                </Badge>
                                <span className="text-sm text-gray-600">Status</span>
                            </div>
                            
                            {connectedIntegrations.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <Settings className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">Connected:</span>
                                    <div className="flex space-x-1">
                                        {connectedIntegrations.map((integration, index) => (
                                            <Badge key={index} className={integration.color} variant="secondary">
                                                {integration.icon} {integration.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {client.shareable_link && (
                                <div className="flex items-center space-x-2">
                                    <Link className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">Shareable Link</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <ClientForm
                        initialData={client ? {
                            name: client.name,
                            logo_url: client.logo_url || '',
                            status: client.status,
                            accounts: {
                                facebookAds: client.accounts?.facebookAds || 'none',
                                googleAds: client.accounts?.googleAds || 'none',
                                goHighLevel: client.accounts?.goHighLevel || 'none',
                                googleSheets: client.accounts?.googleSheets || 'none',
                            },
                            conversionActions: {
                                facebookAds: client.conversion_actions?.facebookAds || '',
                                googleAds: client.conversion_actions?.googleAds || '',
                            },
                            googleSheetsConfig: client.accounts?.googleSheetsConfig || null,
                        } : undefined}
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        isEdit={!!client}
                        clientId={client?.id}
                        submitLabel={client ? "Update Client" : "Create Client"}
                        cancelLabel="Cancel"
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default EditClientModal;