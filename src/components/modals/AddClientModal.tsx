import { ClientForm } from "@/components/agency/ClientForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddClient: (client: {
        name: string;
        logo_url?: string;
        accounts: {
            facebookAds?: string;
            googleAds?: string;
            goHighLevel?: string;
            googleSheets?: string;
        };
        conversionActions?: {
            facebookAds?: string;
            googleAds?: string;
        };
    }) => Promise<void>;
}

const AddClientModal = ({ isOpen, onClose, onAddClient }: AddClientModalProps) => {
    const handleSubmit = async (formData: any) => {
        // Transform form data to match expected format
        const clientData = {
            name: formData.name,
            logo_url: formData.logo_url,
            accounts: {
                facebookAds: formData.accounts.facebookAds === "none" ? undefined : formData.accounts.facebookAds,
                googleAds: formData.accounts.googleAds === "none" ? undefined : formData.accounts.googleAds,
                goHighLevel: formData.accounts.goHighLevel === "none" ? undefined : formData.accounts.goHighLevel,
                googleSheets: formData.accounts.googleSheets === "none" ? undefined : formData.accounts.googleSheets,
            },
            conversionActions: {
                facebookAds: formData.conversionActions.facebookAds,
                googleAds: formData.conversionActions.googleAds,
            }
        };
        
        await onAddClient(clientData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-3xl mx-4 max-h-[75vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Add New Client</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ClientForm
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        submitLabel="Save Client"
                        cancelLabel="Cancel"
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default AddClientModal;