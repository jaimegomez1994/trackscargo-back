import { Router } from 'express';
import { ShipmentController } from '../controllers/shipment.controller';
import { requireAuth, requireOwner } from '../middleware/jwt-auth';
import { apiKeyAuth } from '../middleware/auth'; // Legacy auth
import { 
  createShipmentValidation, 
  addTravelEventValidation, 
  trackingNumberValidation 
} from '../validators/shipment.validators';

const router = Router();

// Public tracking route (no auth required)
router.get('/track/:trackingNumber', trackingNumberValidation, ShipmentController.trackByNumber);

// New JWT-based authenticated routes
router.get('/shipments', requireAuth, ShipmentController.getOrganizationShipments);
router.post('/shipments', requireAuth, createShipmentValidation, ShipmentController.createShipment);
router.post('/shipments/:id/events', requireAuth, addTravelEventValidation, ShipmentController.addTravelEvent);

// Legacy API key routes (for backward compatibility)
router.get('/shipments/legacy', apiKeyAuth, ShipmentController.getShipmentsLegacy);
router.post('/shipments/legacy', apiKeyAuth, ShipmentController.createShipmentLegacy);

export { router as shipmentRoutes };