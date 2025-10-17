import { describe, expect, it } from 'vitest';
import { ClientCreateSchema } from '../src/lib/validation';

describe('ClientCreateSchema Validation Fix', () => {
  it('should pass validation when CRM is enabled with valid GoHighLevel location ID', () => {
    const testData = {
      name: 'Test Client',
      type: 'Client' as const,
      location: 'Test Location',
      logo_url: '',
      status: 'active' as const,
      services: {
        facebookAds: false,
        googleAds: false,
        crm: true,  // CRM enabled
        revenue: false,
      },
      accounts: {
        facebookAds: '',
        googleAds: '',
        goHighLevel: 'vQHFL8RDbErisZjCgSkM', // Valid location ID
        googleSheets: '',
      },
      conversion_actions: {}
    };

    // This should NOT throw an error
    expect(() => ClientCreateSchema.parse(testData)).not.toThrow();
  });

  it('should fail validation when CRM is enabled with empty GoHighLevel', () => {
    const testData = {
      name: 'Test Client',
      type: 'Client' as const,
      location: 'Test Location',
      logo_url: '',
      status: 'active' as const,
      services: {
        facebookAds: false,
        googleAds: false,
        crm: true,  // CRM enabled
        revenue: false,
      },
      accounts: {
        facebookAds: '',
        googleAds: '',
        goHighLevel: '', // Empty - should fail validation
        googleSheets: '',
      },
      conversion_actions: {}
    };

    // This SHOULD throw an error
    expect(() => ClientCreateSchema.parse(testData)).toThrow();
  });

  it('should fail validation when CRM is enabled with "none" GoHighLevel', () => {
    const testData = {
      name: 'Test Client',
      type: 'Client' as const,
      location: 'Test Location',
      logo_url: '',
      status: 'active' as const,
      services: {
        facebookAds: false,
        googleAds: false,
        crm: true,  // CRM enabled
        revenue: false,
      },
      accounts: {
        facebookAds: '',
        googleAds: '',
        goHighLevel: 'none', // "none" - should fail validation
        googleSheets: '',
      },
      conversion_actions: {}
    };

    // This SHOULD throw an error
    expect(() => ClientCreateSchema.parse(testData)).toThrow();
  });

  it('should pass validation when CRM is disabled regardless of GoHighLevel value', () => {
    const testData = {
      name: 'Test Client',
      type: 'Client' as const,
      location: 'Test Location',
      logo_url: '',
      status: 'active' as const,
      services: {
        facebookAds: false,
        googleAds: false,
        crm: false,  // CRM disabled
        revenue: false,
      },
      accounts: {
        facebookAds: '',
        googleAds: '',
        goHighLevel: '', // Empty - should be OK when CRM is disabled
        googleSheets: '',
      },
      conversion_actions: {}
    };

    // This should NOT throw an error
    expect(() => ClientCreateSchema.parse(testData)).not.toThrow();
  });
});
