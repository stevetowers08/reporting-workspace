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
            // Generate unique filename if no path provided
            const fileName = path || `${Date.now()}-${file.name}`;

            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Error uploading file:', error);
                throw new Error(`Failed to upload file: ${error.message}`);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
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
                console.error('Error deleting file:', error);
                throw new Error(`Failed to delete file: ${error.message}`);
            }
        } catch (error) {
            console.error('File deletion error:', error);
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

