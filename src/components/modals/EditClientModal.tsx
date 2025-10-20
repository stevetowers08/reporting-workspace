import { ClientForm } from "@/components/agency/ClientForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debugLogger } from '@/lib/debug';
import { X } from "lucide-react";

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
                // Include Google Sheets configuration in accounts if available
                ...(formData.googleSheetsConfig && {
                    googleSheetsConfig: formData.googleSheetsConfig
                })
            },
            conversion_actions: {
                facebookAds: formData.conversionActions.facebookAds,
                googleAds: formData.conversionActions.googleAds,
            }
        };
        
        
        if (client) {
            // Editing existing client
            debugLogger.info('EditClientModal', 'Calling onUpdateClient', { clientId: client.id, updates: clientData });
            await onUpdateClient(client.id, clientData);
        } else if (onCreateClient) {
            // Creating new client
            debugLogger.info('EditClientModal', 'Calling onCreateClient', { clientData });
            await onCreateClient(clientData);
        }
    };

    if (!isOpen) {return null;}

    // Prepare initial data for the form
    const initialData = client ? {
        name: client.name,
        logo_url: client.logo_url || "",
        status: client.status,
        accounts: {
            facebookAds: client.accounts.facebookAds || "none",
            googleAds: client.accounts.googleAds || "none",
            goHighLevel: client.accounts.goHighLevel || "none",
            googleSheets: client.accounts.googleSheets || "none",
        },
        conversionActions: {
            facebookAds: client.conversion_actions?.facebookAds || "lead",
            googleAds: client.conversion_actions?.googleAds || "conversions",
        },
        googleSheetsConfig: client.accounts?.googleSheetsConfig || null,
    } : {
        name: "",
        logo_url: "",
        status: "active" as const,
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
        googleSheetsConfig: null
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-3xl mx-4 max-h-[75vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">
                        {client ? 'Edit Client' : 'Add New Client'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ClientForm
                        initialData={{
                          ...initialData,
                          googleSheetsConfig: initialData.googleSheetsConfig || undefined
                        }}
                        isEdit={true}
                        clientId={client?.id || ''}
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        submitLabel="Update Client"
                        cancelLabel="Cancel"
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default EditClientModal;