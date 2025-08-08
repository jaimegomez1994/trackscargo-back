import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { shipmentRoutes } from './shipment.routes';
import { eventFileRoutes } from './eventFile.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/', shipmentRoutes); // Mount at root for /api/v1/track and /api/v1/shipments
router.use('/', eventFileRoutes); // Mount at root for /api/v1/events and /api/v1/files

export { router as apiRoutes };