import { expect, test } from '@playwright/test';
import {
    InputSanitizer,
    SanitizationOptions,
    getInputSanitizer,
    sanitizeDate,
    sanitizeEmail,
    sanitizeFormData,
    sanitizeNumber,
    sanitizeString,
    sanitizeUrl
} from '../src/lib/inputSanitization';

test.describe('Input Sanitization Tests', () => {
  
  test.describe('String Sanitization', () => {
    test('should sanitize normal string', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '  Test String  ';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('Test String');
    });

    test('should strip HTML tags by default', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '<p>Test <strong>String</strong></p>';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('Test String');
    });

    test('should allow HTML when configured', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '<p>Test <strong>String</strong></p>';
      const options: SanitizationOptions = { allowHtml: true };
      const result = sanitizer.sanitizeString(input, options);
      expect(result).toBe('<p>Test <strong>String</strong></p>');
    });

    test('should remove script tags', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'Test <script>alert("xss")</script> String';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('Test  String');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('should remove dangerous protocols', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'Test javascript:alert("xss") String';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('Test  String');
      expect(result).not.toContain('javascript:');
    });

    test('should remove event handlers', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'Test onclick="alert(\'xss\')" String';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('Test  String');
      expect(result).not.toContain('onclick');
    });

    test('should apply length limit', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'This is a very long string that should be truncated';
      const options: SanitizationOptions = { maxLength: 20 };
      const result = sanitizer.sanitizeString(input, options);
      expect(result).toBe('This is a very long ');
      expect(result.length).toBe(20);
    });

    test('should normalize whitespace', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'Test    String   with   multiple   spaces';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('Test String with multiple spaces');
    });

    test('should disable whitespace normalization', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'Test    String   with   multiple   spaces';
      const options: SanitizationOptions = { normalizeWhitespace: false };
      const result = sanitizer.sanitizeString(input, options);
      expect(result).toBe('Test    String   with   multiple   spaces');
    });

    test('should remove empty strings when configured', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '   ';
      const options: SanitizationOptions = { removeEmpty: true };
      
      expect(() => {
        sanitizer.sanitizeString(input, options);
      }).toThrow('Input cannot be empty');
    });

    test('should handle complex XSS attempts', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '<img src="x" onerror="alert(\'xss\')"><script>alert("xss")</script><iframe src="javascript:alert(\'xss\')"></iframe>';
      const result = sanitizer.sanitizeString(input);
      expect(result).toBe('');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<iframe>');
      expect(result).not.toContain('onerror');
    });
  });

  test.describe('URL Sanitization', () => {
    test('should sanitize valid HTTP URL', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'https://example.com/path?query=value';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe('https://example.com/path?query=value');
    });

    test('should sanitize valid HTTPS URL', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'https://secure.example.com/path';
      const result = sanitizer.sanitizeUrl(input);
      expect(result).toBe('https://secure.example.com/path');
    });

    test('should reject invalid URL', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'not-a-url';
      
      expect(() => {
        sanitizer.sanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });

    test('should reject non-HTTP URL', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'ftp://example.com';
      
      expect(() => {
        sanitizer.sanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });

    test('should reject javascript URL', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'javascript:alert("xss")';
      
      expect(() => {
        sanitizer.sanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });

    test('should reject data URL', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'data:text/html,<script>alert("xss")</script>';
      
      expect(() => {
        sanitizer.sanitizeUrl(input);
      }).toThrow('Invalid URL format');
    });
  });

  test.describe('Email Sanitization', () => {
    test('should sanitize and normalize email', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '  TEST@EXAMPLE.COM  ';
      const result = sanitizer.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    test('should sanitize valid email', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'user@example.com';
      const result = sanitizer.sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    test('should reject invalid email format', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'not-an-email';
      
      expect(() => {
        sanitizer.sanitizeEmail(input);
      }).toThrow('Invalid email format');
    });

    test('should reject email without domain', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'user@';
      
      expect(() => {
        sanitizer.sanitizeEmail(input);
      }).toThrow('Invalid email format');
    });

    test('should reject email without user', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '@example.com';
      
      expect(() => {
        sanitizer.sanitizeEmail(input);
      }).toThrow('Invalid email format');
    });

    test('should reject email that is too long', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const longEmail = 'a'.repeat(250) + '@example.com';
      
      expect(() => {
        sanitizer.sanitizeEmail(longEmail);
      }).toThrow('Invalid email format');
    });
  });

  test.describe('Number Sanitization', () => {
    test('should sanitize valid number string', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '123.45';
      const result = sanitizer.sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should sanitize valid number', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 123.45;
      const result = sanitizer.sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should remove non-numeric characters', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'abc123.45def';
      const result = sanitizer.sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should reject invalid number format', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'not-a-number';
      
      expect(() => {
        sanitizer.sanitizeNumber(input);
      }).toThrow('Invalid number format');
    });

    test('should enforce integer constraint', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '123.45';
      const options = { integer: true };
      
      expect(() => {
        sanitizer.sanitizeNumber(input, options);
      }).toThrow('Number must be an integer');
    });

    test('should enforce positive constraint', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '-123';
      const options = { positive: true };
      
      expect(() => {
        sanitizer.sanitizeNumber(input, options);
      }).toThrow('Number must be positive');
    });

    test('should enforce minimum value', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '5';
      const options = { min: 10 };
      
      expect(() => {
        sanitizer.sanitizeNumber(input, options);
      }).toThrow('Number must be at least 10');
    });

    test('should enforce maximum value', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '15';
      const options = { max: 10 };
      
      expect(() => {
        sanitizer.sanitizeNumber(input, options);
      }).toThrow('Number must be at most 10');
    });

    test('should accept valid integer', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '123';
      const options = { integer: true };
      const result = sanitizer.sanitizeNumber(input, options);
      expect(result).toBe(123);
    });

    test('should accept valid positive number', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '123.45';
      const options = { positive: true };
      const result = sanitizer.sanitizeNumber(input, options);
      expect(result).toBe(123.45);
    });
  });

  test.describe('Date Sanitization', () => {
    test('should sanitize valid date string', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '2024-01-15';
      const result = sanitizer.sanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });

    test('should sanitize valid Date object', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = new Date('2024-01-15');
      const result = sanitizer.sanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });

    test('should reject invalid date format', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = 'not-a-date';
      
      expect(() => {
        sanitizer.sanitizeDate(input);
      }).toThrow('Invalid date format');
    });

    test('should reject date too far in past', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '1800-01-01'; // More than 100 years ago
      
      expect(() => {
        sanitizer.sanitizeDate(input);
      }).toThrow('Date is outside reasonable range');
    });

    test('should reject date too far in future', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '2050-01-01'; // More than 10 years from now
      
      expect(() => {
        sanitizer.sanitizeDate(input);
      }).toThrow('Date is outside reasonable range');
    });

    test('should accept reasonable date', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const input = '2024-01-15';
      const result = sanitizer.sanitizeDate(input);
      expect(result).toBe('2024-01-15');
    });
  });

  test.describe('Object Sanitization', () => {
    test('should sanitize object with string fields', async () => {
      const sanitizer = InputSanitizer.getInstance();
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
      const sanitizer = InputSanitizer.getInstance();
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
      const sanitizer = InputSanitizer.getInstance();
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
      const sanitizer = InputSanitizer.getInstance();
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
      
      const result = sanitizer.sanitizeFormData(formData, validationSchema);
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
      expect(result.website).toBe('https://example.com');
      expect(result.budget).toBe(1000);
      expect(result.startDate).toBe('2024-01-15');
    });

    test('should reject missing required field', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const formData = {
        email: 'test@example.com',
        // name is missing
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
      };
      
      expect(() => {
        sanitizer.sanitizeFormData(formData, validationSchema);
      }).toThrow('Required field name is missing');
    });

    test('should skip empty optional fields', async () => {
      const sanitizer = InputSanitizer.getInstance();
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
      
      const result = sanitizer.sanitizeFormData(formData, validationSchema);
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
      expect(result.website).toBe('');
    });

    test('should handle invalid field types', async () => {
      const sanitizer = InputSanitizer.getInstance();
      const formData = {
        name: 'Test Client',
        email: 'not-an-email',
      };
      
      const validationSchema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: true },
      };
      
      expect(() => {
        sanitizer.sanitizeFormData(formData, validationSchema);
      }).toThrow('Invalid email format');
    });
  });

  test.describe('Utility Functions', () => {
    test('should get sanitizer instance', async () => {
      const sanitizer = getInputSanitizer();
      expect(sanitizer).toBeDefined();
      expect(sanitizer).toBeInstanceOf(InputSanitizer);
    });

    test('should sanitize string using utility function', async () => {
      const input = '  Test String  ';
      const result = sanitizeString(input);
      expect(result).toBe('Test String');
    });

    test('should sanitize URL using utility function', async () => {
      const input = 'https://example.com';
      const result = sanitizeUrl(input);
      expect(result).toBe('https://example.com');
    });

    test('should sanitize email using utility function', async () => {
      const input = '  TEST@EXAMPLE.COM  ';
      const result = sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    test('should sanitize number using utility function', async () => {
      const input = '123.45';
      const result = sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    test('should sanitize date using utility function', async () => {
      const input = '2024-01-15';
      const result = sanitizeDate(input);
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
      
      const result = sanitizeFormData(formData, validationSchema);
      expect(result.name).toBe('Test Client');
      expect(result.email).toBe('test@example.com');
    });
  });
});
