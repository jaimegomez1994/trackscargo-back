import request from 'supertest';
import express from 'express';
import { apiRoutes } from '../src/routes';
import { prisma } from '../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/v1', apiRoutes);

describe('Shipments API', () => {
  let authToken: string;
  let orgId: string;
  let userId: string;

  beforeEach(async () => {
    // Create test organization and user
    const signupResponse = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        organizationName: 'Shipment Test Corp',
        email: 'shiptest@corp.com',
        password: 'shippass123',
        displayName: 'Ship Test User'
      });

    authToken = signupResponse.body.token;
    orgId = signupResponse.body.organization.id;
    userId = signupResponse.body.user.id;
  });

  describe('POST /api/v1/shipments', () => {
    const validShipmentData = {
      trackingNumber: 'SHIP001',
      origin: 'New York',
      destination: 'Los Angeles',
      weight: 25.5,
      pieces: 3,
      status: 'picked-up',
      company: 'FedEx'
    };

    it('should create shipment with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validShipmentData)
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        trackingNumber: validShipmentData.trackingNumber,
        origin: validShipmentData.origin,
        destination: validShipmentData.destination,
        weight: validShipmentData.weight,
        pieces: validShipmentData.pieces,
        status: validShipmentData.status,
        company: validShipmentData.company,
        travelHistory: []
      });

      // Verify shipment was created in database
      const shipment = await prisma.shipment.findFirst({
        where: { trackingNumber: validShipmentData.trackingNumber }
      });
      expect(shipment).toBeTruthy();
      expect(shipment!.organizationId).toBe(orgId);
      expect(shipment!.createdByUserId).toBe(userId);
    });

    it('should reject duplicate tracking numbers within organization', async () => {
      // Create first shipment
      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validShipmentData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validShipmentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should allow same tracking number across different organizations', async () => {
      // Create shipment in first org
      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validShipmentData)
        .expect(201);

      // Create second organization
      const secondOrgResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          organizationName: 'Second Corp',
          email: 'second@corp.com',
          password: 'secondpass123',
          displayName: 'Second User'
        });

      // Create shipment with same tracking number in second org
      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${secondOrgResponse.body.token}`)
        .send(validShipmentData)
        .expect(201);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/shipments')
        .send(validShipmentData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toHaveLength(6); // All required fields missing
    });

    it('should validate weight is numeric', async () => {
      const invalidData = { ...validShipmentData, weight: 'not-a-number' };

      const response = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details.some((detail: any) => 
        detail.path === 'weight' && detail.msg.includes('number')
      )).toBe(true);
    });

    it('should validate pieces is positive integer', async () => {
      const invalidData = { ...validShipmentData, pieces: -1 };

      const response = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details.some((detail: any) => 
        detail.path === 'pieces' && detail.msg.includes('positive')
      )).toBe(true);
    });
  });

  describe('GET /api/v1/shipments', () => {
    beforeEach(async () => {
      // Create test shipments
      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'TEST001',
          origin: 'New York',
          destination: 'Boston',
          weight: 10,
          pieces: 1,
          status: 'delivered',
          company: 'UPS'
        });

      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'TEST002',
          origin: 'Chicago',
          destination: 'Miami',
          weight: 25,
          pieces: 2,
          status: 'in-transit',
          company: 'FedEx'
        });
    });

    it('should return organization shipments', async () => {
      const response = await request(app)
        .get('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('shipments');
      expect(response.body.shipments).toHaveLength(2);
      
      const trackingNumbers = response.body.shipments.map((s: any) => s.trackingNumber);
      expect(trackingNumbers).toContain('TEST001');
      expect(trackingNumbers).toContain('TEST002');

      // Verify each shipment has correct structure
      response.body.shipments.forEach((shipment: any) => {
        expect(shipment).toHaveProperty('id');
        expect(shipment).toHaveProperty('trackingNumber');
        expect(shipment).toHaveProperty('origin');
        expect(shipment).toHaveProperty('destination');
        expect(shipment).toHaveProperty('weight');
        expect(shipment).toHaveProperty('pieces');
        expect(shipment).toHaveProperty('status');
        expect(shipment).toHaveProperty('company');
        expect(shipment).toHaveProperty('travelHistory');
        expect(Array.isArray(shipment.travelHistory)).toBe(true);
      });
    });

    it('should only return shipments from user organization', async () => {
      // Create second organization with different shipments
      const secondOrgResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          organizationName: 'Isolation Test Corp',
          email: 'isolation@corp.com',
          password: 'isolationpass123',
          displayName: 'Isolation User'
        });

      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${secondOrgResponse.body.token}`)
        .send({
          trackingNumber: 'ISOLATED001',
          origin: 'Portland',
          destination: 'Seattle',
          weight: 5,
          pieces: 1,
          status: 'picked-up',
          company: 'DHL'
        });

      // First org should only see its own shipments
      const response = await request(app)
        .get('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.shipments).toHaveLength(2);
      const trackingNumbers = response.body.shipments.map((s: any) => s.trackingNumber);
      expect(trackingNumbers).not.toContain('ISOLATED001');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/shipments')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('POST /api/v1/shipments/:id/events', () => {
    let shipmentId: string;

    beforeEach(async () => {
      // Create test shipment
      const shipmentResponse = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'EVENT001',
          origin: 'Denver',
          destination: 'Phoenix',
          weight: 15,
          pieces: 1,
          status: 'picked-up',
          company: 'UPS'
        });

      shipmentId = shipmentResponse.body.id;
    });

    const validEventData = {
      status: 'in-transit',
      location: 'Salt Lake City Hub',
      description: 'Package scanned at sorting facility',
      eventType: 'in-transit' as const
    };

    it('should add travel event to shipment', async () => {
      const response = await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEventData)
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        status: validEventData.status,
        location: validEventData.location,
        description: validEventData.description,
        timestamp: expect.any(String),
        type: validEventData.eventType
      });

      // Verify event was created and shipment status updated
      const shipment = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: { travelEvents: true }
      });

      expect(shipment).toBeTruthy();
      expect(shipment!.currentStatus).toBe(validEventData.status);
      expect(shipment!.travelEvents).toHaveLength(1);
      expect(shipment!.travelEvents[0].status).toBe(validEventData.status);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .send(validEventData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject access to shipments from other organizations', async () => {
      // Create second organization
      const secondOrgResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          organizationName: 'Event Isolation Corp',
          email: 'eventisolation@corp.com',
          password: 'eventpass123',
          displayName: 'Event User'
        });

      // Try to add event to first org's shipment using second org's token
      const response = await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .set('Authorization', `Bearer ${secondOrgResponse.body.token}`)
        .send(validEventData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Shipment not found');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should validate event type', async () => {
      const invalidData = { ...validEventData, eventType: 'invalid-type' };

      const response = await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details.some((detail: any) => 
        detail.path === 'eventType' && detail.msg.includes('Invalid event type')
      )).toBe(true);
    });

    it('should return 404 for non-existent shipment', async () => {
      const response = await request(app)
        .post('/api/v1/shipments/non-existent-id/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEventData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Shipment not found');
    });
  });

  describe('GET /api/v1/track/:trackingNumber', () => {
    beforeEach(async () => {
      // Create test shipment with travel events
      const shipmentResponse = await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'TRACK001',
          origin: 'Austin',
          destination: 'Dallas',
          weight: 8,
          pieces: 1,
          status: 'picked-up',
          company: 'FedEx'
        });

      const shipmentId = shipmentResponse.body.id;

      // Add travel events
      await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'in-transit',
          location: 'Austin Facility',
          description: 'Departed origin facility',
          eventType: 'in-transit'
        });

      await request(app)
        .post(`/api/v1/shipments/${shipmentId}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'delivered',
          location: 'Dallas Customer',
          description: 'Delivered to recipient',
          eventType: 'delivered'
        });
    });

    it('should return shipment with travel history (no auth required)', async () => {
      const response = await request(app)
        .get('/api/v1/track/TRACK001')
        .expect(200);

      expect(response.body).toEqual({
        id: expect.any(String),
        trackingNumber: 'TRACK001',
        origin: 'Austin',
        destination: 'Dallas',
        weight: 8,
        pieces: 1,
        status: 'delivered', // Updated by latest event
        company: 'FedEx',
        travelHistory: expect.arrayContaining([
          expect.objectContaining({
            status: 'in-transit',
            location: 'Austin Facility',
            description: 'Departed origin facility',
            type: 'in-transit',
            timestamp: expect.any(String)
          }),
          expect.objectContaining({
            status: 'delivered',
            location: 'Dallas Customer',
            description: 'Delivered to recipient',
            type: 'delivered',
            timestamp: expect.any(String)
          })
        ])
      });

      expect(response.body.travelHistory).toHaveLength(2);
    });

    it('should return 404 for non-existent tracking number', async () => {
      const response = await request(app)
        .get('/api/v1/track/NONEXISTENT')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Shipment not found');
    });

    it('should validate tracking number length', async () => {
      const response = await request(app)
        .get('/api/v1/track/AB') // Too short
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Tracking number must be at least 3 characters');
    });

    it('should work across organizations (public endpoint)', async () => {
      // Create second organization with shipment
      const secondOrgResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          organizationName: 'Public Track Corp',
          email: 'publictrack@corp.com',
          password: 'publicpass123',
          displayName: 'Public User'
        });

      await request(app)
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${secondOrgResponse.body.token}`)
        .send({
          trackingNumber: 'PUBLIC001',
          origin: 'Portland',
          destination: 'Seattle',
          weight: 12,
          pieces: 1,
          status: 'picked-up',
          company: 'UPS'
        });

      // Should be able to track shipment from any organization
      const response = await request(app)
        .get('/api/v1/track/PUBLIC001')
        .expect(200);

      expect(response.body.trackingNumber).toBe('PUBLIC001');
    });
  });
});