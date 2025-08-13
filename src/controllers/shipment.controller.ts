import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ShipmentService } from '../services/shipment.service';
import type { CreateShipmentDTO, CreateTravelEventDTO, UpdateTravelEventDTO } from '../types/shipment.types';

export class ShipmentController {
  // Public endpoint - no auth required (for public tracking)
  static async trackByNumber(req: Request, res: Response) {
    try {
      const { trackingNumber } = req.params;
      
      if (!trackingNumber || trackingNumber.length < 3) {
        return res.status(400).json({ 
          error: 'Tracking number must be at least 3 characters' 
        });
      }

      const shipment = await ShipmentService.getByTrackingNumber(trackingNumber);
      
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      res.json(shipment);
    } catch (error) {
      console.error('Track shipment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Organization-scoped endpoints (require auth)
  static async getOrganizationShipments(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const shipments = await ShipmentService.getOrganizationShipments(
        req.user.organizationId
      );
      
      res.json({ shipments });
    } catch (error) {
      console.error('Get shipments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createShipment(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const data: CreateShipmentDTO = req.body;
      const shipment = await ShipmentService.createShipment(
        data, 
        req.user.organizationId, 
        req.user.userId
      );
      
      res.status(201).json(shipment);
    } catch (error) {
      console.error('Create shipment error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('already exists') ? 400 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }

  static async addTravelEvent(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id: shipmentId } = req.params;
      const data: CreateTravelEventDTO = req.body;
      
      const travelEvent = await ShipmentService.addTravelEvent(
        shipmentId,
        req.user.organizationId,
        data,
        req.user.userId
      );
      
      res.status(201).json(travelEvent);
    } catch (error) {
      console.error('Add travel event error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }

  static async updateTravelEvent(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id: eventId } = req.params;
      const data: UpdateTravelEventDTO = req.body;
      
      const updatedEvent = await ShipmentService.updateTravelEvent(
        eventId,
        req.user.organizationId,
        data,
        req.user.userId
      );
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Update travel event error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('not found') ? 404 : 
                        message.includes('Permission denied') ? 403 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }

  static async deleteTravelEvent(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id: eventId } = req.params;
      
      await ShipmentService.deleteTravelEvent(
        eventId,
        req.user.organizationId,
        req.user.userId
      );
      
      res.status(204).send();
    } catch (error) {
      console.error('Delete travel event error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = message.includes('not found') ? 404 : 
                        message.includes('Permission denied') ? 403 : 500;
      
      res.status(statusCode).json({ error: message });
    }
  }

  // Legacy endpoint - kept for backward compatibility with API key
  static async getShipmentsLegacy(req: Request, res: Response) {
    try {
      // This endpoint will be used by the existing frontend
      // It should work with both API key (legacy) and JWT (new)
      
      // For now, return empty array or mock data
      // This will be properly implemented when we migrate the admin panel
      res.json({ shipments: [] });
    } catch (error) {
      console.error('Legacy get shipments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createShipmentLegacy(req: Request, res: Response) {
    try {
      // Legacy endpoint for API key-based creation
      // For now, just return success to not break existing frontend
      res.status(501).json({ 
        error: 'Please upgrade to organization-based authentication' 
      });
    } catch (error) {
      console.error('Legacy create shipment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}