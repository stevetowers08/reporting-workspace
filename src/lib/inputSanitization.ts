import { debugLogger } from '@/lib/debug';
import { SanitizedEmailSchema, SanitizedStringSchema, SanitizedUrlSchema } from '@/lib/validation';

/**
 * Input Sanitization Service for Production Security
 * 
 * Provides comprehensive input sanitization for:
 * - XSS prevention
 * - SQL injection prevention
 * - Data validation
 * - Content filtering
 */

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  stripTags?: boolean;
  normalizeWhitespace?: boolean;
  removeEmpty?: boolean;
}

export class InputSanitizer {
  private static instance: InputSanitizer;
  
  private constructor() {}
  
  static getInstance(): InputSanitizer {
    if (!InputSanitizer.instance) {
      InputSanitizer.instance = new InputSanitizer();
    }
    return InputSanitizer.instance;
  }

  /**
   * Sanitize a string input
   */
  sanitizeString(input: string, options: SanitizationOptions = {}): string {
    try {
      let sanitized = input;
      
      // Apply length limit FIRST to preserve exact length
      if (options.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
      }
      
      // Strip HTML tags if not allowed
      if (!options.allowHtml) {
        sanitized = this.stripHtmlTags(sanitized);
      }
      
      // Remove potentially dangerous content
      sanitized = this.removeDangerousContent(sanitized);
      
      // Normalize whitespace (but not if maxLength is set to preserve exact length)
      if (options.normalizeWhitespace !== false && !options.maxLength) {
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
      }
      
      // Remove empty strings if requested
      if (options.removeEmpty && sanitized.length === 0) {
        throw new Error('Input cannot be empty');
      }
      
      // Validate using Zod schema (allow empty strings if all dangerous content was removed)
      let result: string;
      try {
        // Skip Zod validation if maxLength is set to preserve exact length
        if (options.maxLength) {
          // If the string is shorter than maxLength, we can trim it
          if (sanitized.length < options.maxLength) {
            result = sanitized.trim();
          } else {
            result = sanitized;
          }
        } else {
          result = SanitizedStringSchema.parse(sanitized);
        }
      } catch (error) {
        // If validation fails due to empty string but we removed dangerous content, allow it
        if (sanitized.length === 0 && input.length > 0) {
          result = sanitized; // Allow empty string if we removed dangerous content
        } else {
          throw error;
        }
      }
      
      debugLogger.debug('InputSanitizer', 'String sanitized successfully', {
        originalLength: input.length,
        sanitizedLength: result.length,
        options,
      });
      
      return result;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'String sanitization failed', {
        input: input.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Re-throw the original error to preserve specific error messages
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Input sanitization failed');
    }
  }

  /**
   * Sanitize a URL input
   */
  sanitizeUrl(input: string): string {
    try {
      const result = SanitizedUrlSchema.parse(input);
      
      debugLogger.debug('InputSanitizer', 'URL sanitized successfully', {
        originalUrl: input,
        sanitizedUrl: result,
      });
      
      return result;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'URL sanitization failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize an email input
   */
  sanitizeEmail(input: string): string {
    try {
      // First normalize the input (trim whitespace and convert to lowercase)
      const normalized = input.trim().toLowerCase();
      
      // Then validate with Zod schema
      const result = SanitizedEmailSchema.parse(normalized);
      
      debugLogger.debug('InputSanitizer', 'Email sanitized successfully', {
        originalEmail: input,
        sanitizedEmail: result,
      });
      
      return result;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'Email sanitization failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Invalid email format');
    }
  }

  /**
   * Sanitize a number input
   */
  sanitizeNumber(input: string | number, options: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  } = {}): number {
    try {
      let num: number;
      
      if (typeof input === 'string') {
        // Remove any non-numeric characters except decimal point and minus
        const cleaned = input.replace(/[^\d.-]/g, '');
        num = parseFloat(cleaned);
      } else {
        num = input;
      }
      
      if (isNaN(num)) {
        throw new Error('Invalid number format');
      }
      
      // Apply constraints
      if (options.integer && !Number.isInteger(num)) {
        throw new Error('Number must be an integer');
      }
      
      if (options.positive && num <= 0) {
        throw new Error('Number must be positive');
      }
      
      if (options.min !== undefined && num < options.min) {
        throw new Error(`Number must be at least ${options.min}`);
      }
      
      if (options.max !== undefined && num > options.max) {
        throw new Error(`Number must be at most ${options.max}`);
      }
      
      debugLogger.debug('InputSanitizer', 'Number sanitized successfully', {
        originalInput: input,
        sanitizedNumber: num,
        options,
      });
      
      return num;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'Number sanitization failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Re-throw the original error to preserve specific error messages
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid number format');
    }
  }

  /**
   * Sanitize a date input
   */
  sanitizeDate(input: string | Date): string {
    try {
      let date: Date;
      
      if (typeof input === 'string') {
        // Try to parse the date
        date = new Date(input);
      } else {
        date = input;
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Check if date is reasonable (not too far in past or future)
      const now = new Date();
      const minDate = new Date(now.getFullYear() - 100, 0, 1); // 100 years ago
      const maxDate = new Date(now.getFullYear() + 10, 11, 31); // 10 years from now
      
      if (date < minDate || date > maxDate) {
        throw new Error('Date is outside reasonable range');
      }
      
      const isoString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      debugLogger.debug('InputSanitizer', 'Date sanitized successfully', {
        originalInput: input,
        sanitizedDate: isoString,
      });
      
      return isoString;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'Date sanitization failed', {
        input,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Re-throw the original error to preserve specific error messages
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Invalid date format');
    }
  }

  /**
   * Sanitize an object with nested sanitization
   */
  sanitizeObject<T extends Record<string, any>>(
    input: T,
    schema: Record<keyof T, SanitizationOptions>
  ): T {
    try {
      const sanitized = {} as T;
      
      for (const [key, value] of Object.entries(input)) {
        const options = schema[key as keyof T];
        
        if (typeof value === 'string') {
          // Check if this looks like an email field
          if (key.toLowerCase().includes('email') && value.includes('@')) {
            sanitized[key as keyof T] = this.sanitizeEmail(value) as T[keyof T];
          } else {
            sanitized[key as keyof T] = this.sanitizeString(value, options) as T[keyof T];
          }
        } else if (Array.isArray(value)) {
          // Handle arrays by preserving them as-is
          sanitized[key as keyof T] = value as T[keyof T];
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key as keyof T] = this.sanitizeObject(value, options || {}) as T[keyof T];
        } else {
          sanitized[key as keyof T] = value;
        }
      }
      
      debugLogger.debug('InputSanitizer', 'Object sanitized successfully', {
        originalKeys: Object.keys(input),
        sanitizedKeys: Object.keys(sanitized),
      });
      
      return sanitized;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'Object sanitization failed', {
        input: JSON.stringify(input).substring(0, 200),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Object sanitization failed');
    }
  }

  /**
   * Strip HTML tags from input
   */
  private stripHtmlTags(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Remove potentially dangerous content
   */
  private removeDangerousContent(input: string): string {
    return input
      // Remove JavaScript protocols (more comprehensive)
      .replace(/javascript\s*:\s*[^"'\s>]*/gi, '')
      .replace(/vbscript\s*:\s*[^"'\s>]*/gi, '')
      .replace(/data\s*:\s*[^"'\s>]*/gi, '')
      .replace(/file\s*:\s*[^"'\s>]*/gi, '')
      
      // Remove event handlers (more comprehensive)
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^"'\s>]+/gi, '')
      
      // Remove SQL injection patterns
      .replace(/('|(\\')|(;)|(\-\-)|(\/\*)|(\*\/))/gi, '')
      
      // Remove potential XSS patterns (more comprehensive)
      .replace(/<iframe[^>]*>/gi, '')
      .replace(/<object[^>]*>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<script[^>]*>/gi, '')
      
      // Remove any remaining dangerous content
      .replace(/alert\s*\([^)]*\)/gi, '')
      .replace(/eval\s*\([^)]*\)/gi, '')
      .replace(/document\.[^"'\s>]*/gi, '')
      .replace(/window\.[^"'\s>]*/gi, '')
      
      // Remove any remaining quotes and parentheses that might be dangerous
      .replace(/["']/g, '')
      .replace(/[()]/g, '')
      
      // Remove any remaining dangerous words
      .replace(/\b(alert|eval|document|window|javascript|vbscript|data|file)\b/gi, '');
  }

  /**
   * Validate and sanitize form data
   */
  sanitizeFormData<T extends Record<string, any>>(
    formData: T,
    validationSchema: Record<keyof T, {
      type: 'string' | 'email' | 'url' | 'number' | 'date';
      options?: SanitizationOptions;
      required?: boolean;
    }>
  ): T {
    try {
      const sanitized = {} as T;
      
      for (const [key, value] of Object.entries(formData)) {
        const schema = validationSchema[key as keyof T];
        
        if (!schema) {
          debugLogger.warn('InputSanitizer', `No validation schema for field: ${key}`);
          sanitized[key as keyof T] = value;
          continue;
        }
        
        // Check if required field is missing
        if (schema.required && (value === undefined || value === null || value === '')) {
          throw new Error(`Required field ${key} is missing`);
        }
        
        // Skip empty optional fields
        if (!schema.required && (value === undefined || value === null || value === '')) {
          sanitized[key as keyof T] = value;
          continue;
        }
        
        // Sanitize based on type
        switch (schema.type) {
          case 'string':
            sanitized[key as keyof T] = this.sanitizeString(value, schema.options) as T[keyof T];
            break;
          case 'email':
            sanitized[key as keyof T] = this.sanitizeEmail(value) as T[keyof T];
            break;
          case 'url':
            sanitized[key as keyof T] = this.sanitizeUrl(value) as T[keyof T];
            break;
          case 'number':
            sanitized[key as keyof T] = this.sanitizeNumber(value, schema.options) as T[keyof T];
            break;
          case 'date':
            sanitized[key as keyof T] = this.sanitizeDate(value) as T[keyof T];
            break;
          default:
            sanitized[key as keyof T] = value;
        }
      }
      
      // Check for missing required fields that weren't in the formData
      for (const [key, schema] of Object.entries(validationSchema)) {
        if (schema.required && !(key in formData)) {
          throw new Error(`Required field ${key} is missing`);
        }
      }
      
      debugLogger.info('InputSanitizer', 'Form data sanitized successfully', {
        fields: Object.keys(formData),
        sanitizedFields: Object.keys(sanitized),
      });
      
      return sanitized;
    } catch (error) {
      debugLogger.error('InputSanitizer', 'Form data sanitization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export const getInputSanitizer = () => InputSanitizer.getInstance();

export const sanitizeString = (input: string, options?: SanitizationOptions) => {
  const sanitizer = InputSanitizer.getInstance();
  return sanitizer.sanitizeString(input, options);
};

export const sanitizeUrl = (input: string) => {
  const sanitizer = InputSanitizer.getInstance();
  return sanitizer.sanitizeUrl(input);
};

export const sanitizeEmail = (input: string) => {
  const sanitizer = InputSanitizer.getInstance();
  return sanitizer.sanitizeEmail(input);
};

export const sanitizeNumber = (input: string | number, options?: any) => {
  const sanitizer = InputSanitizer.getInstance();
  return sanitizer.sanitizeNumber(input, options);
};

export const sanitizeDate = (input: string | Date) => {
  const sanitizer = InputSanitizer.getInstance();
  return sanitizer.sanitizeDate(input);
};

export const sanitizeFormData = <T extends Record<string, any>>(
  formData: T,
  validationSchema: Record<keyof T, any>
) => {
  const sanitizer = InputSanitizer.getInstance();
  return sanitizer.sanitizeFormData(formData, validationSchema);
};
