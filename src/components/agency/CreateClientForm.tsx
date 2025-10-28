import { Button } from "@/components/ui/button-simple";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label-simple";
import { debugLogger } from '@/lib/debug';
import { FileUploadService } from "@/services/config/fileUploadService";
import { ImageIcon, X } from "lucide-react";
import React, { useState } from 'react';

interface CreateClientFormData {
  name: string;
  logo_url: string;
}

interface CreateClientFormProps {
  onSubmit: (formData: CreateClientFormData) => Promise<void>;
  onCancel: () => void;
}

export const CreateClientForm: React.FC<CreateClientFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateClientFormData>({
    name: "",
    logo_url: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<globalThis.File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    if (!formData.name.trim()) {
      setErrors({ name: "Client name is required" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload logo if a new file was selected
      let logoUrl = formData.logo_url;
      if (logoFile) {
        logoUrl = await FileUploadService.uploadFile(logoFile);
        debugLogger.info('CreateClientForm', 'Logo uploaded successfully', { url: logoUrl });
      }
      
      await onSubmit({
        ...formData,
        logo_url: logoUrl
      });
    } catch (error) {
      debugLogger.error('CreateClientForm', 'Failed to submit form', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create client';
      setErrors({ 
        submit: errorMessage,
        logo: error instanceof Error && error.message.includes('logo') ? error.message : undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
    if (errors.name) {
      setErrors({ ...errors, name: "" });
    }
  };
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ logo: "File size must be less than 5MB" });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrors({ logo: "File must be an image" });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData({ ...formData, logo_url: "" });
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo_url: "" }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-sm font-medium">Client Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={handleNameChange}
          placeholder="Enter client name"
          className={`mt-1 ${errors.name ? "border-red-500" : ""}`}
          disabled={isSubmitting}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

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
                disabled={isSubmitting}
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
          {errors.logo && <p className="text-xs text-red-500 mt-1">{errors.logo}</p>}
        </div>
      </div>
      
      <p className="text-sm text-gray-500">
        You can add integrations after creating the client.
      </p>
      
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.name.trim()}
        >
          {isSubmitting ? "Creating..." : "Create Client"}
        </Button>
      </div>
    </form>
  );
};

