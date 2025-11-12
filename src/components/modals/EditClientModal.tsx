import { ClientForm } from "@/components/agency/ClientForm";
import { CreateClientForm } from "@/components/agency/CreateClientForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import React, { useState, useEffect } from "react";

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
    services?: {
        facebookAds?: boolean;
        googleAds?: boolean;
        crm?: boolean;
        revenue?: boolean;
        tabSettings?: {
            summary?: boolean;
            meta?: boolean;
            google?: boolean;
            leads?: boolean;
        };
    };
    tabSettings?: {
        summary?: boolean;
        meta?: boolean;
        google?: boolean;
        leads?: boolean;
    };
}

interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
    onCreateClient?: (clientData: { name: string; logo_url?: string; status: 'active' | 'paused' | 'inactive' }) => Promise<void>;
    client: Client | null;
    onReloadClient?: () => Promise<void>;
}

const EditClientModal = ({ isOpen, onClose, onUpdateClient, onCreateClient, client, onReloadClient }: EditClientModalProps) => {
    const [currentClient, setCurrentClient] = useState<Client | null>(client);
    
    // Update currentClient when client prop changes (but don't force form re-render)
    useEffect(() => {
        setCurrentClient(client);
    }, [client]);
    
    // Reload client data when onReloadClient is provided
    const handleReloadClient = async () => {
        if (onReloadClient && client?.id) {
            await onReloadClient();
            // The client prop will be updated by the parent, which will trigger the useEffect above
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <Card 
                className="w-full max-w-3xl mx-2 max-h-[75vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">
                        {client ? 'Edit Client & Connections' : 'Create New Client'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!client ? (
                        // Creating new client - minimal form
                        <CreateClientForm
                            onSubmit={async (formData) => {
                                if (onCreateClient) {
                                    await onCreateClient({
                                        name: formData.name,
                                        logo_url: formData.logo_url,
                                        status: "active"
                                    });
                                }
                            }}
                            onCancel={onClose}
                        />
                    ) : (
                        // Editing existing client - full form with all connections
                        <ClientForm
                            key={currentClient?.id} // Only re-render if client ID changes (new client), not on data updates
                            initialData={{
                                name: currentClient?.name || "",
                                logo_url: currentClient?.logo_url || "",
                                accounts: {
                                    facebookAds: currentClient?.accounts.facebookAds || "none",
                                    googleAds: currentClient?.accounts.googleAds || "none",
                                    goHighLevel: currentClient?.accounts.goHighLevel || "none",
                                    googleSheets: currentClient?.accounts.googleSheets || "none",
                                },
                                conversionActions: {
                                    facebookAds: currentClient?.conversion_actions?.facebookAds || "lead",
                                    googleAds: currentClient?.conversion_actions?.googleAds || "conversions",
                                },
                                googleSheetsConfig: currentClient?.accounts?.googleSheetsConfig || undefined,
                                tabSettings: currentClient?.services?.tabSettings || currentClient?.tabSettings || {
                                    summary: true,
                                    meta: true,
                                    google: true,
                                    leads: true,
                                },
                            }}
                            isEdit={true}
                            clientId={currentClient?.id || ""}
                            onClientDataReload={handleReloadClient}
                            onSubmit={async (formData) => {
                                await onUpdateClient(currentClient?.id || "", {
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
                                    },
                                    tabSettings: formData.tabSettings,
                                });
                            }}
                            onCancel={onClose}
                            submitLabel="Save Changes"
                            cancelLabel="Cancel"
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default EditClientModal;
