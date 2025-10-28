import { ClientForm } from "@/components/agency/ClientForm";
import { CreateClientForm } from "@/components/agency/CreateClientForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    onCreateClient?: (clientData: { name: string; logo_url?: string; status: 'active' | 'paused' | 'inactive' }) => Promise<void>;
    client: Client | null;
}

const EditClientModal = ({ isOpen, onClose, onUpdateClient, onCreateClient, client }: EditClientModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-3xl mx-4 max-h-[75vh] overflow-y-auto">
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
                            initialData={{
                                name: client.name,
                                logo_url: client.logo_url || "",
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
                                googleSheetsConfig: client.accounts?.googleSheetsConfig || undefined,
                            }}
                            isEdit={true}
                            clientId={client.id}
                            onSubmit={async (formData) => {
                                await onUpdateClient(client.id, {
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
