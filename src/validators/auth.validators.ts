import { body } from 'express-validator';

export const signupValidation = [
  body('organizationName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be 2-100 characters')
    .trim(),
  body('displayName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be 2-100 characters')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];