import { expect, test } from '@playwright/test';

// Mock environment for Node.js test environment
if (typeof import.meta === 'undefined') {
  global.import = global.import || {};
  global.import.meta = global.import.meta || {};
  global.import.meta.env = global.import.meta.env || {};
}

// Mock the input sanitization module
class MockMockInputSanitizer {
  private static instance: MockMockInputSanitizer;

  static getInstance(): MockMockInputSanitizer {
    if (!MockMockInputSanitizer.instance) {
      MockMockInputSanitizer.instance = new MockMockInputSanitizer();
    }
    return MockMockInputSanitizer.instance;
  }

  mockSanitizeString(input: string, options?: { allowHtml?: boolean }): string {
    let result = input.trim();
    
    if (!options?.allowHtml) {
      result = result.replace(/<[^>]*>/g, '');
    }
    
    // Remove script tags specifically
    result = result.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    return result;
  }

  mockSanitizeUrl(input: string): string {
    const url = input.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  mockSanitizeEmail(input: string): string {
    return input.trim().toLowerCase();
  }

  mockSanitizeNumber(input: string | number): number {
    if (typeof input === 'number') return input;
    return parseFloat(input) || 0;
  }

  mockSanitizeDate(input: string): string {
    return input.trim();
  }

  mockSanitizeFormData(formData: any, schema: any): any {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        sanitized[key] = this.mockSanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

const mockSanitizeString = (input: string, options?: { allowHtml?: boolean }) => {
  return MockMockInputSanitizer.getInstance().mockSanitizeString(input, options);
};

const mockSanitizeUrl = (input: string) => {
  return MockMockInputSanitizer.getInstance().mockSanitizeUrl(input);
};

const mockSanitizeEmail = (input: string) => {
  return MockMockInputSanitizer.getInstance().mockSanitizeEmail(input);
};

const mockSanitizeNumber = (input: string | number) => {
  return MockMockInputSanitizer.getInstance().mockSanitizeNumber(input);
};

const mockSanitizeDate = (input: string) => {
  return MockMockInputSanitizer.getInstance().mockSanitizeDate(input);
};

const mockSanitizeFormData = (formData: any, schema: any) => {
  return MockMockInputSanitizer.getInstance().mockSanitizeFormData(formData, schema);
};

const mockGetMockInputSanitizer = () => MockMockInputSanitizer.getInstance();

test.describe('Input Sanitization Tests', () => {
  
  test.describe('String Sanitization', () => {
    test('should sanitize normal string', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '  Test String  ';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('Test String');
    });

    test('should strip HTML tags by default', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '<p>Test <strong>String</strong></p>';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('Test String');
    });

    test('should allow HTML when configured', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '<p>Test <strong>String</strong></p>';
      const options: SanitizationOptions = { allowHtml: true };
      const result = sanitizer.mockSanitizeString(input, options);
      expect(result).toBe('<p>Test <strong>String</strong></p>');
    });

    test('should remove script tags', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'Test <script>alert("xss")</script> String';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('Test  String');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('should remove dangerous protocols', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'Test javascript:alert("xss") String';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('Test  String');
      expect(result).not.toContain('javascript:');
    });

    test('should remove event handlers', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'Test onclick="alert(\'xss\')" String';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('Test  String');
      expect(result).not.toContain('onclick');
    });

    test('should apply length limit', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'This is a very long string that should be truncated';
      const options: SanitizationOptions = { maxLength: 20 };
      const result = sanitizer.mockSanitizeString(input, options);
      expect(result).toBe('This is a very long ');
      expect(result.length).toBe(20);
    });

    test('should normalize whitespace', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'Test    String   with   multiple   spaces';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('Test String with multiple spaces');
    });

    test('should disable whitespace normalization', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'Test    String   with   multiple   spaces';
      const options: SanitizationOptions = { normalizeWhitespace: false };
      const result = sanitizer.mockSanitizeString(input, options);
      expect(result).toBe('Test    String   with   multiple   spaces');
    });

    test('should remove empty strings when configured', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '   ';
      const options: SanitizationOptions = { removeEmpty: true };
      
      expect(() => {
        sanitizer.mockSanitizeString(input, options);
      }).toThrow('Input cannot be empty');
    });

    test('should handle complex XSS attempts', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '<img src="x" onerror="alert(\'xss\')"><script>alert("xss")</script><iframe src="javascript:alert(\'xss\')"></iframe>';
      const result = sanitizer.mockSanitizeString(input);
      expect(result).toBe('');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('onerror');
    });
  });

  test.describe('URL Sanitization', () => {
    test('should sanitize valid HTTP URL', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'https://example.com/path?query=value';
      const result = sanitizer.mockSanitizeUrl(input);
      expect(result).toBe('https://example.com/path?query=value');
    });

    test('should sanitize valid HTTPS URL', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'https://secure.example.com/path';
      const result = sanitizer.mockSanitizeUrl(input);
      expect(result).toBe('https://secure.example.com/path');
    });

    test('should reject invalid URL', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'not-a-url';
      
      expect(() => {
        sanitizer.mockSanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });

    test('should reject non-HTTP URL', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'ftp://example.com';
      
      expect(() => {
        sanitizer.mockSanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });

    test('should reject javascript URL', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'javascript:alert("xss")';
      
      expect(() => {
        sanitizer.mockSanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });

    test('should reject data URL', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'data:text/html,<script>alert("xss")</script>';
      
      expect(() => {
        sanitizer.mockSanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });
  });

  test.describe('Email Sanitization', () => {
    test('should sanitize and normalize email', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '  TEST@EXAMPLE.COM  ';
      const result = sanitizer.mockSanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    test('should sanitize valid email', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'user@example.com';
      const result = sanitizer.mockSanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    test('should reject invalid email format', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'not-an-email';
      
      expect(() => {
        sanitizer.mockSanitizeEmail(input);
      }).toThrow('Invalid email format');
    });

    test('should reject email without domain', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'user@';
      
      expect(() => {
        sanitizer.mockSanitizeEmail(input);
      }).toThrow('Invalid email format');
    });

    test('should reject email without user', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '@example.com';
      
      expect(() => {
        sanitizer.mockSanitizeEmail(input);
      }).toThrow('Invalid email format');
    });

    test('should reject email that is too long', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const longEmail = 'a'.repeat(250) + '@example.com';
      
      expect(() => {
        sanitizer.mockSanitizeEmail(longEmail);
      }).toThrow('Invalid email format');
    });
  });

  test.describe('Number Sanitization', () => {
    test('should sanitize valid number string', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '123.45';
      const result = sanitizer.mockSanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should sanitize valid number', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 123.45;
      const result = sanitizer.mockSanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should remove non-numeric characters', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'abc123.45def';
      const result = sanitizer.mockSanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should reject invalid number format', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'not-a-number';
      
      expect(() => {
        sanitizer.mockSanitizeNumber(input);
      }).toThrow('Invalid number format');
    });

    test('should enforce integer constraint', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '123.45';
      const options = { integer: true };
      
      expect(() => {
        sanitizer.mockSanitizeNumber(input, options);
      }).toThrow('Number must be an integer');
    });

    test('should enforce positive constraint', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '-123';
      const options = { positive: true };
      
      expect(() => {
        sanitizer.mockSanitizeNumber(input, options);
      }).toThrow('Number must be positive');
    });

    test('should enforce minimum value', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '5';
      const options = { min: 10 };
      
      expect(() => {
        sanitizer.mockSanitizeNumber(input, options);
      }).toThrow('Number must be at least 10');
    });

    test('should enforce maximum value', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '15';
      const options = { max: 10 };
      
      expect(() => {
        sanitizer.mockSanitizeNumber(input, options);
      }).toThrow('Number must be at most 10');
    });

    test('should accept valid integer', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '123';
      const options = { integer: true };
      const result = sanitizer.mockSanitizeNumber(input, options);
      expect(result).toBe(123);
    });

    test('should accept valid positive number', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '123.45';
      const options = { positive: true };
      const result = sanitizer.mockSanitizeNumber(input, options);
      expect(result).toBe(123.45);
    });
  });

  test.describe('Date Sanitization', () => {
    test('should sanitize valid date string', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '2024-01-15';
      const result = sanitizer.mockSanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });

    test('should sanitize valid Date object', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = new Date('2024-01-15');
      const result = sanitizer.mockSanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });

    test('should reject invalid date format', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = 'not-a-date';
      
      expect(() => {
        sanitizer.mockSanitizeDate(input);
      }).toThrow('Invalid date format');
    });

    test('should reject date too far in past', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '1800-01-01'; // More than 100 years ago
      
      expect(() => {
        sanitizer.mockSanitizeDate(input);
      }).toThrow('Date is outside reasonable range');
    });

    test('should reject date too far in future', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '2050-01-01'; // More than 10 years from now
      
      expect(() => {
        sanitizer.mockSanitizeDate(input);
      }).toThrow('Date is outside reasonable range');
    });

    test('should accept reasonable date', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = '2024-01-15';
      const result = sanitizer.mockSanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });
  });

  test.describe('Object Sanitization', () => {
    test('should sanitize object with string fields', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = {
        name: '  Test Name  ',
        description: '<p>Test Description</p>',
        email: '  TEST@EXAMPLE.COM  ',
      };
      
      const schema = {
        name: { maxLength: 50 },
        description: { stripTags: true },
        email: {},
      };
      
      const result = sanitizer.sanitizeObject(input, schema);
      expect(result.name).toBe('Test Name');
      expect(result.description).toBe('Test Description');
      expect(result.email).toBe('test@example.com');
    });

    test('should handle nested objects', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = {
        user: {
          name: '  Test User  ',
          email: 'test@example.com',
        },
        settings: {
          theme: 'dark',
        },
      };
      
      const schema = {
        user: {
          name: {},
          email: {},
        },
        settings: {},
      };
      
      const result = sanitizer.sanitizeObject(input, schema);
      expect(result.user.name).toBe('Test User');
      expect(result.user.email).toBe('test@example.com');
      expect(result.settings.theme).toBe('dark');
    });

    test('should preserve non-string values', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const input = {
        name: 'Test Name',
        count: 123,
        active: true,
        items: ['item1', 'item2'],
      };
      
      const schema = {
        name: {},
        count: {},
        active: {},
        items: {},
      };
      
      const result = sanitizer.sanitizeObject(input, schema);
      expect(result.name).toBe('Test Name');
      expect(result.count).toBe(123);
      expect(result.active).toBe(true);
      expect(result.items).toEqual(['item1', 'item2']);
    });
  });

  test.describe('Form Data Sanitization', () => {
    test('should sanitize valid form data', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const formData = {
        name: '  Test Client  ',
        email: 'test@example.com',
        website: 'https://example.com',
        budget: '1000',
        startDate: '2024-01-15',
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
        website: { type: 'url' as const, required: false },
        budget: { type: 'number' as const, required: true, options: { positive: true } },
        startDate: { type: 'date' as const, required: true },
      };
      
      const result = sanitizer.mockSanitizeFormData(formData, validationSchema);
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
      expect(result.website).toBe('https://example.com');
      expect(result.budget).toBe(1000);
      expect(result.startDate).toBe('2024-01-15');
    });

    test('should reject missing required field', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const formData = {
        email: 'test@example.com',
        // name is missing
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
      };
      
      expect(() => {
        sanitizer.mockSanitizeFormData(formData, validationSchema);
      }).toThrow('Required field name is missing');
    });

    test('should skip empty optional fields', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const formData = {
        name: 'Test Client',
        email: 'test@example.com',
        website: '', // Empty optional field
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
        website: { type: 'url' as const, required: false },
      };
      
      const result = sanitizer.mockSanitizeFormData(formData, validationSchema);
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
      expect(result.website).toBe('');
    });

    test('should handle invalid field types', async () => {
      const sanitizer = MockInputSanitizer.getInstance();
      const formData = {
        name: 'Test Client',
        email: 'not-an-email',
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
      };
      
      expect(() => {
        sanitizer.mockSanitizeFormData(formData, validationSchema);
      }).toThrow('Invalid email format');
    });
  });

  test.describe('Utility Functions', () => {
    test('should get sanitizer instance', async () => {
      const sanitizer = getMockInputSanitizer();
      expect(sanitizer).toBeDefined();
      expect(sanitizer).toBeInstanceOf(MockInputSanitizer);
    });

    test('should sanitize string using utility function', async () => {
      const input = '  Test String  ';
      const result = mockSanitizeString(input);
      expect(result).toBe('Test String');
    });

    test('should sanitize URL using utility function', async () => {
      const input = 'https://example.com';
      const result = mockSanitizeUrl(input);
      expect(result).toBe('https://example.com');
    });

    test('should sanitize email using utility function', async () => {
      const input = '  TEST@EXAMPLE.COM  ';
      const result = mockSanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    test('should sanitize number using utility function', async () => {
      const input = '123.45';
      const result = mockSanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should sanitize date using utility function', async () => {
      const input = '2024-01-15';
      const result = mockSanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });

    test('should sanitize form data using utility function', async () => {
      const formData = {
        name: 'Test Client',
        email: 'test@example.com',
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
      };
      
      const result = mockSanitizeFormData(formData, validationSchema);
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
    });
  });
});
