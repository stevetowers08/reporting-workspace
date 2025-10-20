import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { debugLogger } from '@/lib/debug';
import { FileUploadService } from '@/services/config/fileUploadService';
import { ImageIcon, X } from 'lucide-react';
import React, { useState } from 'react';

interface ClientDraftFormProps {
  onSubmit: (data: { name: string; logo_url?: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ClientDraftForm: React.FC<ClientDraftFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    logo_url: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    debugLogger.info('ClientDraftForm', 'Form submission started', { formData });

    // Clear previous errors
    setErrors({});

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Client name is required";
    }

    if (formData.name && formData.name.length > 100) {
      newErrors.name = "Client name must be less than 100 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      debugLogger.warn('ClientDraftForm', 'Form validation failed', newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim() || undefined
      });
      debugLogger.info('ClientDraftForm', 'Form submitted successfully');
    } catch (error) {
      debugLogger.error('ClientDraftForm', 'Form submission failed', error);
      setErrors({ submit: 'Failed to create client. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setErrors({});

      try {
        // Upload file to Supabase Storage
        const logoUrl = await FileUploadService.uploadClientLogo(file, formData.name || 'client');

        // Create preview URL for immediate display
        const previewUrl = window.URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        setFormData(prev => ({ ...prev, logo_url: logoUrl }));

        debugLogger.info('ClientDraftForm', 'Logo uploaded successfully', { logoUrl });
      } catch (error) {
        debugLogger.error('ClientDraftForm', 'Error uploading logo', error);
        setErrors({ logo: error instanceof Error ? error.message : 'Failed to upload logo. Please try again.' });
      }
    }
  };

  const removeLogo = () => {
    if (logoPreview) {
      window.URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    setLogoFile(null);
    setFormData(prev => ({ ...prev, logo_url: "" }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Create New Client</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter client name"
              className={errors.name ? 'border-red-500' : ''}
              disabled={isSubmitting || isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Logo Upload Section */}
          <div className="space-y-3">
            {/* Logo Preview */}
            {(logoPreview || formData.logo_url) && (
              <div className="relative inline-block">
                <img
                  src={logoPreview || formData.logo_url}
                  alt="Logo preview"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  disabled={isSubmitting || isLoading}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Large Upload Area */}
            <div 
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = handleLogoUpload;
                input.click();
              }}
            >
              <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <div>
                <p className="text-base font-medium text-slate-900 mb-1">
                  {logoPreview || formData.logo_url ? 'Change Logo' : 'Upload Logo'}
                </p>
                <p className="text-sm text-slate-500">PNG, JPG up to 5MB</p>
              </div>
            </div>
            {errors.logo && (
              <p className="text-sm text-red-500">{errors.logo}</p>
            )}
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="flex-1"
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creating...' : 'Create Client'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
        >
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
};
