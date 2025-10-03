import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  describe('When combining class names', () => {
    it('Then should merge Tailwind classes correctly', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const additionalClasses = 'px-6 bg-blue-500';

      // Act
      const result = cn(baseClasses, additionalClasses);

      // Assert
      expect(result).toBe('py-2 px-6 bg-blue-500');
    });

    it('Then should handle conditional classes', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const conditionalClasses = true ? 'bg-red-500' : 'bg-blue-500';
      const additionalClasses = 'text-white';

      // Act
      const result = cn(baseClasses, conditionalClasses, additionalClasses);

      // Assert
      expect(result).toBe('px-4 py-2 bg-red-500 text-white');
    });

    it('Then should handle undefined and null values', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const undefinedClass = undefined;
      const nullClass = null;
      const additionalClasses = 'bg-blue-500';

      // Act
      const result = cn(baseClasses, undefinedClass, nullClass, additionalClasses);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('Then should handle empty strings', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const emptyString = '';
      const additionalClasses = 'bg-blue-500';

      // Act
      const result = cn(baseClasses, emptyString, additionalClasses);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('Then should handle arrays of classes', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const arrayClasses = ['bg-blue-500', 'text-white'];
      const additionalClasses = 'rounded-md';

      // Act
      const result = cn(baseClasses, arrayClasses, additionalClasses);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white rounded-md');
    });

    it('Then should handle objects with boolean values', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const objectClasses = {
        'bg-blue-500': true,
        'text-white': true,
        'bg-red-500': false,
        'text-black': false,
      };
      const additionalClasses = 'rounded-md';

      // Act
      const result = cn(baseClasses, objectClasses, additionalClasses);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white rounded-md');
    });

    it('Then should handle complex combinations', () => {
      // Arrange
      const baseClasses = 'px-4 py-2';
      const conditionalClasses = true ? 'bg-red-500' : 'bg-blue-500';
      const arrayClasses = ['text-white', 'font-bold'];
      const objectClasses = {
        'rounded-md': true,
        'shadow-lg': false,
        'hover:bg-red-600': true,
      };
      const additionalClasses = 'transition-colors';

      // Act
      const result = cn(
        baseClasses,
        conditionalClasses,
        arrayClasses,
        objectClasses,
        additionalClasses
      );

      // Assert
      expect(result).toBe(
        'px-4 py-2 bg-red-500 text-white font-bold rounded-md hover:bg-red-600 transition-colors'
      );
    });

    it('Then should handle conflicting Tailwind classes by keeping the last one', () => {
      // Arrange
      const conflictingClasses = 'px-4 px-6 px-8';

      // Act
      const result = cn(conflictingClasses);

      // Assert
      expect(result).toBe('px-8');
    });

    it('Then should handle no arguments', () => {
      // Act
      const result = cn();

      // Assert
      expect(result).toBe('');
    });

    it('Then should handle single class string', () => {
      // Arrange
      const singleClass = 'px-4';

      // Act
      const result = cn(singleClass);

      // Assert
      expect(result).toBe('px-4');
    });

    it('Then should handle mixed data types', () => {
      // Arrange
      const stringClass = 'px-4';
      const arrayClass = ['py-2', 'bg-blue-500'];
      const objectClass = { 'text-white': true, 'text-black': false };
      const conditionalClass = false ? 'rounded-md' : 'rounded-lg';

      // Act
      const result = cn(stringClass, arrayClass, objectClass, conditionalClass);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white rounded-lg');
    });
  });

  describe('When handling edge cases', () => {
    it('Then should handle whitespace-only strings', () => {
      // Arrange
      const whitespaceClass = '   ';
      const normalClass = 'px-4';

      // Act
      const result = cn(whitespaceClass, normalClass);

      // Assert
      expect(result).toBe('px-4');
    });

    it('Then should handle classes with extra spaces', () => {
      // Arrange
      const spacedClass = '  px-4  py-2  ';
      const normalClass = 'bg-blue-500';

      // Act
      const result = cn(spacedClass, normalClass);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500');
    });

    it('Then should handle deeply nested arrays', () => {
      // Arrange
      const nestedArray = [['px-4', ['py-2', 'bg-blue-500']], 'text-white'];

      // Act
      const result = cn(nestedArray);

      // Assert
      expect(result).toBe('px-4 py-2 bg-blue-500 text-white');
    });
  });
});
