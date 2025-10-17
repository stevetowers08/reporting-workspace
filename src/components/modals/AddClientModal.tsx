import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useState } from "react";
import React from "react";

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddClient: (client: {
        name: string;
    }) => Promise<void>;
}

const AddClientModal = ({ isOpen, onClose, onAddClient }: AddClientModalProps) => {
    const [clientName, setClientName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!clientName.trim()) {
            setError('Client name is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onAddClient({ name: clientName.trim() });
            setClientName('');
            onClose();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to create client');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setClientName('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Create New Client</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="clientName">Client Name</Label>
                            <Input
                                id="clientName"
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Enter client name"
                                className="mt-1"
                                disabled={isSubmitting}
                            />
                            {error && (
                                <p className="text-sm text-red-500 mt-1">{error}</p>
                            )}
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isSubmitting || !clientName.trim()}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Client'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AddClientModal;