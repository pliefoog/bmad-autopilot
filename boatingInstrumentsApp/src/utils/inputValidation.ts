/**
 * Input Validation Utilities
 * Story 13.2.2 - Task 6: Common validation functions
 *
 * Provides reusable validators for common input types:
 * - Email addresses
 * - IP addresses
 * - Port numbers
 * - Number ranges
 * - Required fields
 * - Custom regex patterns
 */

/**
 * Validation result type
 * Returns error message string if invalid, undefined if valid
 */
export type ValidationResult = string | undefined;

/**
 * Validator function type
 */
export type Validator = (value: string) => ValidationResult;

/**
 * Common input validators
 */
export const validators = {
  /**
   * Required field validator
   * Ensures value is not empty or whitespace-only
   */
  required: (value: string): ValidationResult => {
    return value.trim() ? undefined : 'This field is required';
  },

  /**
   * Email address validator
   * Basic RFC 5322 email format validation
   */
  email: (value: string): ValidationResult => {
    if (!value.trim()) return undefined; // Empty is valid (use required separately)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? undefined : 'Invalid email address format';
  },

  /**
   * IP address validator (IPv4)
   * Validates standard dotted-decimal notation (e.g., 192.168.1.1)
   */
  ipAddress: (value: string): ValidationResult => {
    if (!value.trim()) return undefined; // Empty is valid (use required separately)

    // Check format: xxx.xxx.xxx.xxx
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(value)) {
      return 'Invalid IP address format (expected: xxx.xxx.xxx.xxx)';
    }

    // Check octet ranges (0-255)
    const octets = value.split('.').map(Number);
    const validOctets = octets.every((octet) => octet >= 0 && octet <= 255);

    return validOctets ? undefined : 'IP address octets must be between 0 and 255';
  },

  /**
   * Port number validator
   * Validates TCP/UDP port numbers (1-65535)
   */
  portNumber: (value: string): ValidationResult => {
    if (!value.trim()) return undefined; // Empty is valid (use required separately)

    const port = Number(value);

    if (isNaN(port)) {
      return 'Port must be a number';
    }

    if (!Number.isInteger(port)) {
      return 'Port must be a whole number';
    }

    if (port < 1 || port > 65535) {
      return 'Port must be between 1 and 65535';
    }

    return undefined;
  },

  /**
   * Number range validator factory
   * Creates validator that checks if number is within min/max range
   *
   * @param min - Minimum allowed value (inclusive)
   * @param max - Maximum allowed value (inclusive)
   * @returns Validator function
   *
   * @example
   * const speedValidator = validators.numberRange(0, 50); // 0-50 knots
   */
  numberRange: (min: number, max: number): Validator => {
    return (value: string): ValidationResult => {
      if (!value.trim()) return undefined; // Empty is valid

      const num = Number(value);

      if (isNaN(num)) {
        return 'Must be a valid number';
      }

      if (num < min || num > max) {
        return `Must be between ${min} and ${max}`;
      }

      return undefined;
    };
  },

  /**
   * Integer validator
   * Ensures value is a whole number (no decimals)
   */
  integer: (value: string): ValidationResult => {
    if (!value.trim()) return undefined; // Empty is valid

    const num = Number(value);

    if (isNaN(num)) {
      return 'Must be a number';
    }

    if (!Number.isInteger(num)) {
      return 'Must be a whole number (no decimals)';
    }

    return undefined;
  },

  /**
   * Regex validator factory
   * Creates validator that checks against custom regex pattern
   *
   * @param pattern - Regular expression to test against
   * @param errorMessage - Custom error message to display
   * @returns Validator function
   *
   * @example
   * const hexColorValidator = validators.regex(
   *   /^#[0-9A-Fa-f]{6}$/,
   *   'Must be a valid hex color (e.g., #FF0000)'
   * );
   */
  regex: (pattern: RegExp, errorMessage: string): Validator => {
    return (value: string): ValidationResult => {
      if (!value.trim()) return undefined; // Empty is valid

      return pattern.test(value) ? undefined : errorMessage;
    };
  },

  /**
   * Minimum length validator factory
   * Creates validator that checks minimum string length
   *
   * @param minLength - Minimum required length
   * @returns Validator function
   */
  minLength: (minLength: number): Validator => {
    return (value: string): ValidationResult => {
      if (!value.trim()) return undefined; // Empty is valid

      return value.length >= minLength ? undefined : `Must be at least ${minLength} characters`;
    };
  },

  /**
   * Maximum length validator factory
   * Creates validator that checks maximum string length
   *
   * @param maxLength - Maximum allowed length
   * @returns Validator function
   */
  maxLength: (maxLength: number): Validator => {
    return (value: string): ValidationResult => {
      return value.length <= maxLength ? undefined : `Must be no more than ${maxLength} characters`;
    };
  },
};

/**
 * Compose multiple validators into a single validator
 * Runs validators in order, returns first error found
 *
 * @param validators - Array of validator functions
 * @returns Combined validator function
 *
 * @example
 * const ipValidator = composeValidators([
 *   validators.required,
 *   validators.ipAddress
 * ]);
 */
export const composeValidators = (...validatorFuncs: Validator[]): Validator => {
  return (value: string): ValidationResult => {
    for (const validator of validatorFuncs) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  };
};

/**
 * Helper to create a validator that only runs when value is not empty
 * Useful for optional fields with format requirements
 *
 * @param validator - Validator to wrap
 * @returns Wrapped validator that skips empty values
 *
 * @example
 * const optionalEmailValidator = optionalField(validators.email);
 */
export const optionalField = (validator: Validator): Validator => {
  return (value: string): ValidationResult => {
    if (!value.trim()) return undefined;
    return validator(value);
  };
};
