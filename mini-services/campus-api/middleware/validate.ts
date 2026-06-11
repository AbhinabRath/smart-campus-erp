// =============================================================================
// Input Validation Middleware
// =============================================================================
// Provides a reusable middleware factory for validating request body fields.
// Instead of writing validation logic in every controller, we define rules
// declaratively and let this middleware handle it. This ensures consistent
// validation across all endpoints and keeps controllers clean.
//
// Supported validators:
//   - required: field must be present and non-empty
//   - isString: field must be a string
//   - isNumber: field must be a number
//   - min: minimum value for numbers or minimum length for strings
//   - max: maximum value for numbers or maximum length for strings
//   - isIn: field must be one of the allowed values
//   - isEmail: field must look like an email address
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

type ValidatorRule = {
  field: string;
  required?: boolean;
  isString?: boolean;
  isNumber?: boolean;
  min?: number;
  max?: number;
  isIn?: string[];
  isEmail?: boolean;
};

/**
 * validate - Creates validation middleware from an array of rules.
 * Returns a middleware function that checks the request body against each rule.
 * Collects ALL validation errors (not just the first) so the client can fix
 * everything in one shot.
 *
 * Usage:
 *   router.post('/users', validate([
 *     { field: 'name', required: true, isString: true },
 *     { field: 'email', required: true, isEmail: true },
 *     { field: 'role', required: true, isIn: ['admin', 'teacher', 'student'] },
 *   ]), controller);
 */
export function validate(rules: ValidatorRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const body = req.body;

    for (const rule of rules) {
      const value = body[rule.field];

      // Required check: field must exist and not be empty string
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required.`);
        continue; // Skip further checks if field is missing
      }

      // If field is optional and not provided, skip remaining checks
      if (value === undefined || value === null) continue;

      // Type checks
      if (rule.isString && typeof value !== 'string') {
        errors.push(`${rule.field} must be a string.`);
      }

      if (rule.isNumber && (typeof value !== 'number' || isNaN(value))) {
        errors.push(`${rule.field} must be a number.`);
      }

      // String length / number range checks
      if (typeof value === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min} characters.`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max} characters.`);
        }
      }

      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}.`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must be at most ${rule.max}.`);
        }
      }

      // Enum check: value must be in the allowed set
      if (rule.isIn && !rule.isIn.includes(String(value))) {
        errors.push(`${rule.field} must be one of: ${rule.isIn.join(', ')}.`);
      }

      // Basic email format check
      if (rule.isEmail && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${rule.field} must be a valid email address.`);
      }
    }

    if (errors.length > 0) {
      errorResponse(res, 'Validation failed.', 400, errors);
      return;
    }

    next();
  };
}
