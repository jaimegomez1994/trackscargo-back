import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/jwt-auth';
import {
  signupValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} from '../validators/auth.validators';

const router = Router();

// Public authentication routes
router.post('/signup', signupValidation, AuthController.signup);
router.post('/login', loginValidation, AuthController.login);
router.post('/forgot-password', forgotPasswordValidation, AuthController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, AuthController.resetPassword);

// Protected routes
router.get('/me', requireAuth, AuthController.me);

export { router as authRoutes };