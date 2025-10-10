# OAuth Token Storage Simplification Plan

## Goal
Document the simple OAuth token storage approach as the standard for ALL services in development. Keep it simple and working.

## Documentation Updates Required

### 1. Core Documentation Files

**File: `docs/ai/GOOGLE_ADS_API_DOCUMENTATION.md`**
- Add section: "Token Storage Approach"
- Document that tokens are stored directly in `integrations.config.tokens`
- Note this is the standard approach for development
- Mention encryption can be added later via database triggers

**File: `docs/ai/OAUTH_IMPLEMENTATION_GUIDE.md`**
- Update token storage section to reflect simple approach
- Remove references to complex encryption
- Add note: "Simple storage is the standard for all OAuth services"
- Document the `integrations` table structure

**File: `CONFIGURATION.md`**
- Add section: "OAuth Token Storage"
- Document the simple approach
- Note this applies to Google Ads, Google Sheets, Facebook, GHL
- Mention development vs production considerations

**File: `ARCHITECTURE.md`**
- Add section: "OAuth Token Architecture"
- Document the `integrations` table
- Explain the simple JSON storage approach
- Note security considerations

### 2. Service-Specific Documentation

**File: `docs/ai/FACEBOOK_ADS_API_DOCUMENTATION.md`** (if exists)
- Update to use same simple token storage approach

**File: `docs/ai/GOHIGHLEVEL_API_DOCUMENTATION.md`** (if exists)
- Update to use same simple token storage approach

### 3. Implementation Notes

**Standard Approach for ALL OAuth Services:**
- Tokens stored directly in `integrations.config.tokens` as plain JSON
- No frontend encryption complexity
- No Supabase RPC calls for encryption
- Simple, working implementation
- Database-level security via Row Level Security policies

**Security Considerations:**
- Tokens protected by Supabase RLS policies
- Database access controls
- HTTPS in production
- Encryption can be added later via database triggers without code changes

## Implementation Steps

1. Update all documentation files
2. Verify TokenManager.ts changes are correct
3. Check for linting errors
4. Commit documentation updates
5. Push changes to deploy
6. Test Google Ads OAuth flow

## Files to Modify

- `docs/ai/GOOGLE_ADS_API_DOCUMENTATION.md`
- `docs/ai/OAUTH_IMPLEMENTATION_GUIDE.md`
- `CONFIGURATION.md`
- `ARCHITECTURE.md`
- Any other OAuth service documentation files

## Expected Outcome

- Clear documentation that simple token storage is the standard
- All OAuth services use the same approach
- No encryption complexity in development
- Working OAuth flows for all services
