import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/jwt-auth';
import { signupValidation, loginValidation } from '../validators/auth.validators';

const router = Router();

// Public authentication routes
router.post('/signup', signupValidation, AuthController.signup);
router.post('/login', loginValidation, AuthController.login);

// Protected routes
router.get('/me', requireAuth, AuthController.me);

export { router as authRoutes };