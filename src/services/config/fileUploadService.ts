import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

export class FileUploadService {
    /**
     * Upload a file to Supabase Storage
     */
    static async uploadFile(
        file: File,
        bucket: string = 'client-logos',
        path?: string
    ): Promise<string> {
        try {
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('Invalid file type. Please upload PNG, JPG, GIF, or WebP images only.');
            }

            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('File size must be less than 5MB.');
            }

            // Generate unique filename if no path provided
            const fileName = path || `${Date.now()}-${file.name}`;

            debugLogger.info('FileUploadService', 'Uploading file', { 
                fileName, 
                fileSize: file.size, 
                fileType: file.type,
                bucket 
            });

            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                debugLogger.error('FileUploadService', 'Supabase storage error', error);
                
                // Provide more specific error messages
                if (error.message.includes('not found')) {
                    throw new Error('Storage bucket not found. Please contact support.');
                } else if (error.message.includes('permission')) {
                    throw new Error('Permission denied. Please check your authentication.');
                } else if (error.message.includes('size')) {
                    throw new Error('File size exceeds the allowed limit.');
                } else {
                    throw new Error(`Upload failed: ${error.message}`);
                }
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            debugLogger.info('FileUploadService', 'File uploaded successfully', { 
                fileName, 
                publicUrl: urlData.publicUrl 
            });

            return urlData.publicUrl;
        } catch (error) {
            debugLogger.error('FileUploadService', 'File upload error', error);
            
            // Re-throw with user-friendly message if it's our custom error
            if (error instanceof Error && error.message.includes('Invalid file type')) {
                throw error;
            }
            if (error instanceof Error && error.message.includes('File size must be less than 5MB')) {
                throw error;
            }
            
            // For other errors, provide a generic message
            throw new Error('Failed to upload file. Please try again.');
        }
    }

    /**
     * Upload client logo
     */
    static async uploadClientLogo(file: File, clientName: string): Promise<string> {
        // Sanitize client name for filename
        const sanitizedName = clientName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const fileName = `${sanitizedName}-${Date.now()}.${file.name.split('.').pop()}`;

        return this.uploadFile(file, 'client-logos', fileName);
    }

    /**
     * Delete a file from Supabase Storage
     */
    static async deleteFile(bucket: string, fileName: string): Promise<void> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([fileName]);

            if (error) {
                debugLogger.error('FileUploadService', 'Error deleting file', error);
                throw new Error(`Failed to delete file: ${error.message}`);
            }
        } catch (error) {
            debugLogger.error('FileUploadService', 'File deletion error', error);
            throw error;
        }
    }

    /**
     * Get file URL from Supabase Storage
     */
    static getFileUrl(bucket: string, fileName: string): string {
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return data.publicUrl;
    }
}

