import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { shipmentRoutes } from './shipment.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/', shipmentRoutes); // Mount at root for /api/v1/track and /api/v1/shipments

export { router as apiRoutes };