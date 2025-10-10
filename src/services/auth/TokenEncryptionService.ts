import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

/**
 * Token Encryption Service using Supabase Vault
 * Provides secure encryption/decryption of sensitive tokens
 */
export class TokenEncryptionService {

  /**
   * Encrypt sensitive data using Supabase Vault
   */
  static async encryptToken(token: string): Promise<string> {
    try {
      // Use Supabase Vault for encryption
      const { data, error } = await supabase.rpc('encrypt_sensitive_data', {
        data: token
      });

      if (error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      debugLogger.error('TokenEncryptionService', 'Failed to encrypt token', error);
      throw new Error('Failed to encrypt token securely');
    }
  }

  /**
   * Decrypt sensitive data using Supabase Vault
   */
  static async decryptToken(encryptedToken: string): Promise<string> {
    try {
      // Use Supabase Vault for decryption
      const { data, error } = await supabase.rpc('decrypt_sensitive_data', {
        encrypted_data: encryptedToken
      });

      if (error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      debugLogger.error('TokenEncryptionService', 'Failed to decrypt token', error);
      throw new Error('Failed to decrypt token securely');
    }
  }

  /**
   * Encrypt OAuth tokens object
   */
  static async encryptOAuthTokens(tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    tokenType?: string;
    scope?: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    tokenType?: string;
    scope?: string;
  }> {
    try {
      const encryptedTokens: any = {};

      // Encrypt access token
      encryptedTokens.accessToken = await this.encryptToken(tokens.accessToken);

      // Encrypt refresh token if present
      if (tokens.refreshToken) {
        encryptedTokens.refreshToken = await this.encryptToken(tokens.refreshToken);
      }

      // Keep non-sensitive data as-is
      encryptedTokens.expiresAt = tokens.expiresAt;
      encryptedTokens.tokenType = tokens.tokenType;
      encryptedTokens.scope = tokens.scope;

      return encryptedTokens;
    } catch (error) {
      debugLogger.error('TokenEncryptionService', 'Failed to encrypt OAuth tokens', error);
      throw new Error('Failed to encrypt OAuth tokens securely');
    }
  }

  /**
   * Decrypt OAuth tokens object
   */
  static async decryptOAuthTokens(encryptedTokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    tokenType?: string;
    scope?: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    tokenType?: string;
    scope?: string;
  }> {
    try {
      const decryptedTokens: any = {};

      // Decrypt access token
      decryptedTokens.accessToken = await this.decryptToken(encryptedTokens.accessToken);

      // Decrypt refresh token if present
      if (encryptedTokens.refreshToken) {
        decryptedTokens.refreshToken = await this.decryptToken(encryptedTokens.refreshToken);
      }

      // Keep non-sensitive data as-is
      decryptedTokens.expiresAt = encryptedTokens.expiresAt;
      decryptedTokens.tokenType = encryptedTokens.tokenType;
      decryptedTokens.scope = encryptedTokens.scope;

      return decryptedTokens;
    } catch (error) {
      debugLogger.error('TokenEncryptionService', 'Failed to decrypt OAuth tokens', error);
      throw new Error('Failed to decrypt OAuth tokens securely');
    }
  }

  /**
   * Check if token is encrypted (basic heuristic)
   */
  static isEncrypted(token: string): boolean {
    // Encrypted tokens are base64 encoded and typically longer
    // This is a basic check - in production, use a more robust method
    return token.length > 100 && /^[A-Za-z0-9+/=]+$/.test(token);
  }

  /**
   * Safely decrypt token if it's encrypted, otherwise return as-is
   */
  static async safeDecryptToken(token: string): Promise<string> {
    if (this.isEncrypted(token)) {
      return await this.decryptToken(token);
    }
    return token;
  }

  /**
   * Safely encrypt token if it's not already encrypted
   */
  static async safeEncryptToken(token: string): Promise<string> {
    if (!this.isEncrypted(token)) {
      return await this.encryptToken(token);
    }
    return token;
  }
}
