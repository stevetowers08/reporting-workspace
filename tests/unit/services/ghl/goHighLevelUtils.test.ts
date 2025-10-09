// Tests for GoHighLevel Utilities

import {
    GHLCache,
    GHLFormatter,
    GHLQueryBuilder,
    GHLRateLimiter,
    GHLValidator
} from '@/services/ghl/goHighLevelUtils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('GHLRateLimiter', () => {
  beforeEach(() => {
    // Reset rate limiter state
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await GHLRateLimiter.sleep(100);
      const end = Date.now();
      
      // Should complete quickly due to mocked setTimeout
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('enforceRateLimit', () => {
    it('should not throw when called multiple times quickly', async () => {
      // Should not throw even with mocked setTimeout
      await expect(GHLRateLimiter.enforceRateLimit()).resolves.not.toThrow();
      await expect(GHLRateLimiter.enforceRateLimit()).resolves.not.toThrow();
    });
  });

  describe('handleRateLimitError', () => {
    it('should handle rate limit error response', async () => {
      const mockResponse = {
        headers: {
          get: vi.fn().mockReturnValue('60')
        }
      } as any;

      await expect(GHLRateLimiter.handleRateLimitError(mockResponse)).resolves.not.toThrow();
    });
  });
});

describe('GHLQueryBuilder', () => {
  describe('buildContactQuery', () => {
    it('should build query with date parameters', () => {
      const dateParams = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      
      const query = GHLQueryBuilder.buildContactQuery(dateParams);
      expect(query).toContain('startDate=2024-01-01');
      expect(query).toContain('endDate=2024-01-31');
    });

    it('should return empty string when no date parameters', () => {
      const query = GHLQueryBuilder.buildContactQuery();
      expect(query).toBe('');
    });

    it('should handle partial date parameters', () => {
      const dateParams = { startDate: '2024-01-01' };
      const query = GHLQueryBuilder.buildContactQuery(dateParams);
      expect(query).toContain('startDate=2024-01-01');
      expect(query).not.toContain('endDate');
    });
  });

  describe('buildPaginationQuery', () => {
    it('should build pagination query with default values', () => {
      const query = GHLQueryBuilder.buildPaginationQuery();
      expect(query).toContain('limit=100');
      expect(query).toContain('offset=0');
    });

    it('should build pagination query with custom values', () => {
      const query = GHLQueryBuilder.buildPaginationQuery(50, 25);
      expect(query).toContain('limit=50');
      expect(query).toContain('offset=25');
    });
  });
});

describe('GHLCache', () => {
  beforeEach(() => {
    GHLCache.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      GHLCache.set(key, data);
      const retrieved = GHLCache.get(key);
      
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const retrieved = GHLCache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should overwrite existing data', () => {
      const key = 'test-key';
      const data1 = { test: 'data1' };
      const data2 = { test: 'data2' };
      
      GHLCache.set(key, data1);
      GHLCache.set(key, data2);
      
      const retrieved = GHLCache.get(key);
      expect(retrieved).toEqual(data2);
    });
  });

  describe('delete', () => {
    it('should delete cached data', () => {
      const key = 'test-key';
      const data = { test: 'data' };
      
      GHLCache.set(key, data);
      expect(GHLCache.get(key)).toEqual(data);
      
      GHLCache.delete(key);
      expect(GHLCache.get(key)).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      GHLCache.set('key1', 'data1');
      GHLCache.set('key2', 'data2');
      
      GHLCache.clear();
      
      expect(GHLCache.get('key1')).toBeNull();
      expect(GHLCache.get('key2')).toBeNull();
    });
  });
});

describe('GHLValidator', () => {
  describe('validateLocationId', () => {
    it('should validate correct location ID', () => {
      expect(GHLValidator.validateLocationId('location-123')).toBe(true);
      expect(GHLValidator.validateLocationId('abc123')).toBe(true);
    });

    it('should reject invalid location IDs', () => {
      expect(GHLValidator.validateLocationId('')).toBe(false);
      expect(GHLValidator.validateLocationId('   ')).toBe(false);
      expect(GHLValidator.validateLocationId(null as any)).toBe(false);
      expect(GHLValidator.validateLocationId(undefined as any)).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should validate correct tokens', () => {
      expect(GHLValidator.validateToken('token-123')).toBe(true);
      expect(GHLValidator.validateToken('pit-abc123')).toBe(true);
    });

    it('should reject invalid tokens', () => {
      expect(GHLValidator.validateToken('')).toBe(false);
      expect(GHLValidator.validateToken('   ')).toBe(false);
      expect(GHLValidator.validateToken(null as any)).toBe(false);
      expect(GHLValidator.validateToken(undefined as any)).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should validate correct date range', () => {
      expect(GHLValidator.validateDateRange('2024-01-01', '2024-01-31')).toBe(true);
      expect(GHLValidator.validateDateRange('2024-01-01', '2024-01-01')).toBe(true);
    });

    it('should reject invalid date range', () => {
      expect(GHLValidator.validateDateRange('2024-01-31', '2024-01-01')).toBe(false);
    });

    it('should accept missing dates', () => {
      expect(GHLValidator.validateDateRange()).toBe(true);
      expect(GHLValidator.validateDateRange('2024-01-01')).toBe(true);
      expect(GHLValidator.validateDateRange(undefined, '2024-01-31')).toBe(true);
    });
  });
});

describe('GHLFormatter', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(GHLFormatter.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(GHLFormatter.formatCurrency(0)).toBe('$0.00');
      expect(GHLFormatter.formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should format currency with custom currency', () => {
      expect(GHLFormatter.formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage correctly', () => {
      expect(GHLFormatter.formatPercentage(12.345)).toBe('12.35%');
      expect(GHLFormatter.formatPercentage(0)).toBe('0.00%');
      expect(GHLFormatter.formatPercentage(100)).toBe('100.00%');
    });

    it('should format percentage with custom decimals', () => {
      expect(GHLFormatter.formatPercentage(12.345, 1)).toBe('12.3%');
      expect(GHLFormatter.formatPercentage(12.345, 0)).toBe('12%');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = '2024-01-15T10:30:00Z';
      const formatted = GHLFormatter.formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = GHLFormatter.formatDate(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time correctly', () => {
      const date = '2024-01-15T10:30:00Z';
      const formatted = GHLFormatter.formatDateTime(date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
      expect(formatted).toContain('09:30');
    });
  });
});
