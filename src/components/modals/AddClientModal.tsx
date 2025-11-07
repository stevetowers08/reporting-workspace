import { CreateClientForm } from "@/components/agency/CreateClientForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddClient: (client: {
        name: string;
        logo_url?: string;
        status: 'active' | 'paused' | 'inactive';
    }) => Promise<void>;
}

const AddClientModal = ({ isOpen, onClose, onAddClient }: AddClientModalProps) => {
    const handleSubmit = async (formData: { name: string; logo_url: string }) => {
        await onAddClient({
            name: formData.name,
            logo_url: formData.logo_url,
            status: 'active'
        });
    };

    if (!isOpen) {return null;}

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4 max-h-[75vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">Add New Venue</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <CreateClientForm
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default AddClientModal;