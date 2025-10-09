# Token Encryption Troubleshooting Guide

## Overview

This guide helps resolve token encryption and decryption issues that can cause 401 authentication errors in integrations.

## Common Issues

### 1. 401 Authentication Errors

**Symptoms**:
- Integration shows as connected but API calls fail with 401
- Error message: "Request had invalid authentication credentials"
- Console shows: "No Google OAuth access token found"

**Root Cause**: Token decryption failure due to missing or incorrect encryption key

**Solution**:
1. Check if `VITE_ENCRYPTION_KEY` environment variable is set
2. Verify the key matches the one used when tokens were encrypted
3. For development, the default key `'dev-encryption-key-change-in-production'` is used

### 2. Token Format Detection Issues

**Symptoms**:
- Tokens exist in database but appear corrupted
- Decryption errors in console logs
- Integration status inconsistent

**Root Cause**: Tokens encrypted with different key or format

**Solution**:
1. Check token format in database (encrypted tokens contain `:` separator)
2. Verify encryption key consistency across environments
3. Use TokenManager's automatic format detection

## Environment Configuration

### Development Setup
```bash
# Optional - uses default key if not set
VITE_ENCRYPTION_KEY=dev-encryption-key-change-in-production
```

### Production Setup
```bash
# Required - use a secure 32-character key
VITE_ENCRYPTION_KEY=your-32-character-production-key-here
```

## Token Management

### Automatic Format Detection
The TokenManager now automatically detects token formats:

```typescript
// Encrypted token (contains ':')
if (encryptedToken.includes(':')) {
  // AES-GCM encrypted format - decrypt normally
  accessToken = await TokenEncryption.decrypt(encryptedToken);
} else {
  // Plain text token - use directly
  accessToken = encryptedToken;
}
```

### Manual Token Decryption
If you need to manually decrypt tokens:

```javascript
// Use the same logic as TokenEncryption.decrypt()
const ENCRYPTION_KEY = 'dev-encryption-key-change-in-production';
const keyString = ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);

// Import key material
const keyMaterial = await crypto.subtle.importKey(
  "raw", new TextEncoder().encode(keyString),
  { name: "AES-GCM" }, false, ["decrypt"]
);

// Decode IV and encrypted data
const [ivString, encryptedString] = encryptedToken.split(":");
const iv = base64ToArrayBuffer(ivString);
const data = base64ToArrayBuffer(encryptedString);

// Decrypt
const decrypted = await crypto.subtle.decrypt(
  { name: "AES-GCM", iv: iv }, keyMaterial, data
);

return new TextDecoder().decode(decrypted);
```

## Database Queries

### Check Token Format
```sql
SELECT 
  platform,
  CASE 
    WHEN config->'tokens'->>'accessToken' LIKE '%:%' 
    THEN 'encrypted' 
    ELSE 'plain_text' 
  END as token_format,
  LENGTH(config->'tokens'->>'accessToken') as token_length
FROM integrations 
WHERE platform = 'googleSheets';
```

### Update Tokens to Plain Text (Emergency Fix)
```sql
-- Only use this if decryption consistently fails
UPDATE integrations 
SET config = jsonb_set(
  config, 
  '{tokens,accessToken}', 
  '"your_decrypted_access_token_here"'::jsonb
)
WHERE platform = 'googleSheets';
```

## Prevention

### 1. Consistent Environment Variables
- Always set `VITE_ENCRYPTION_KEY` in production
- Use the same key across all environments
- Document key changes in team communications

### 2. Token Validation
- Implement token validation before API calls
- Add fallback mechanisms for decryption failures
- Monitor token expiration and refresh cycles

### 3. Error Handling
- Log decryption failures with context
- Provide user-friendly error messages
- Implement automatic token refresh when possible

## Recovery Procedures

### If All Tokens Are Corrupted
1. Clear all integration tokens from database
2. Force users to re-authenticate
3. Ensure `VITE_ENCRYPTION_KEY` is properly set
4. Monitor new token encryption/decryption

### If Only Some Tokens Are Affected
1. Identify affected integrations
2. Manually decrypt tokens using correct key
3. Update database with decrypted tokens
4. Verify API functionality

## Monitoring

### Key Metrics to Track
- Token decryption success rate
- API authentication failure rate
- Token refresh frequency
- Integration connection status

### Log Patterns to Watch
```
TokenManager: Failed to decrypt access token
TokenEncryption: Failed to decrypt token
GoogleSheetsService: No access token available
```

## Support

If issues persist:
1. Check the main API documentation
2. Review the project status in `docs/ai/PROJECT_STATUS.md`
3. Verify environment configuration
4. Test with a fresh integration connection

---

**Last Updated**: January 6, 2025  
**Related**: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) | [PROJECT_STATUS.md](./PROJECT_STATUS.md)
