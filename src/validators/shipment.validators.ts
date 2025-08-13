import { body, param } from 'express-validator';

export const createShipmentValidation = [
  body('trackingNumber')
    .isLength({ min: 1 })
    .withMessage('Tracking number is required')
    .trim(),
  body('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .trim(),
  body('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .trim(),
  body('weight')
    .isNumeric()
    .withMessage('Weight must be a number'),
  body('pieces')
    .isInt({ min: 1 })
    .withMessage('Pieces must be a positive integer'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .trim(),
  body('company')
    .optional()
    .trim()
];

export const addTravelEventValidation = [
  param('id')
    .isString()
    .withMessage('Invalid shipment ID'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .trim(),
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .trim(),
  body('description')
    .optional()
    .trim(),
  body('eventType')
    .isIn(['picked-up', 'in-transit', 'delivered', 'exception', 'out-for-delivery', 'attempted-delivery', 'at-facility', 'customs-clearance', 'returned'])
    .withMessage('Invalid event type')
];

export const updateTravelEventValidation = [
  param('id')
    .isString()
    .withMessage('Invalid event ID'),
  body('status')
    .optional()
    .notEmpty()
    .withMessage('Status cannot be empty if provided')
    .trim(),
  body('location')
    .optional()
    .notEmpty()
    .withMessage('Location cannot be empty if provided')
    .trim(),
  body('description')
    .optional()
    .trim(),
  body('eventType')
    .optional()
    .isIn(['picked-up', 'in-transit', 'delivered', 'exception', 'out-for-delivery', 'attempted-delivery', 'at-facility', 'customs-clearance', 'returned'])
    .withMessage('Invalid event type')
];

export const trackingNumberValidation = [
  param('trackingNumber')
    .isLength({ min: 1 })
    .withMessage('Tracking number is required')
];