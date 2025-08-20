import { AuthService } from '../src/services/auth.service';
import { ShipmentService } from '../src/services/shipment.service';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

describe('Service Layer Unit Tests', () => {
  describe('AuthService', () => {
    describe('createOrganization', () => {
      it('should create organization with owner user', async () => {
        const createData = {
          organizationName: 'Service Test Corp',
          email: 'servicetest@corp.com',
          password: 'servicepass123',
          displayName: 'Service Test User'
        };

        const result = await AuthService.createOrganization(createData);

        expect(result).toHaveProperty('message', 'Organization created successfully');
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('organization');

        expect(result.user).toEqual({
          id: expect.any(String),
          email: createData.email,
          displayName: createData.displayName,
          role: 'owner'
        });

        expect(result.organization).toEqual({
          id: expect.any(String),
          name: createData.organizationName,
          slug: 'service-test-corp',
          plan: 'free'
        });

        // Verify database state
        const org = await prisma.organization.findUnique({
          where: { slug: 'service-test-corp' },
          include: { users: true }
        });

        expect(org).toBeTruthy();
        expect(org!.users).toHaveLength(1);
        expect(org!.users[0].role).toBe('owner');
        expect(org!.ownerUserId).toBe(org!.users[0].id);
      });

      it('should generate unique slug for duplicate organization names', async () => {
        const createData1 = {
          organizationName: 'Duplicate Name Corp',
          email: 'user1@duplicate.com',
          password: 'pass123',
          displayName: 'User One'
        };

        const createData2 = {
          organizationName: 'Duplicate Name Corp',
          email: 'user2@duplicate.com',
          password: 'pass123',
          displayName: 'User Two'
        };

        const result1 = await AuthService.createOrganization(createData1);
        const result2 = await AuthService.createOrganization(createData2);

        expect(result1.organization.slug).toBe('duplicate-name-corp');
        expect(result2.organization.slug).toBe('duplicate-name-corp-1');
      });

      it('should reject duplicate email addresses', async () => {
        const createData = {
          organizationName: 'Email Test Corp',
          email: 'duplicate@service.com',
          password: 'pass123',
          displayName: 'User One'
        };

        await AuthService.createOrganization(createData);

        const duplicateEmailData = {
          organizationName: 'Different Corp',
          email: 'duplicate@service.com',
          password: 'pass123',
          displayName: 'User Two'
        };

        await expect(AuthService.createOrganization(duplicateEmailData))
          .rejects.toThrow('already exists');
      });

      it('should hash password before storing', async () => {
        const createData = {
          organizationName: 'Password Test Corp',
          email: 'passwordtest@corp.com',
          password: 'plaintextpassword',
          displayName: 'Password User'
        };

        await AuthService.createOrganization(createData);

        const user = await prisma.user.findFirst({
          where: { email: createData.email }
        });

        expect(user).toBeTruthy();
        expect(user!.passwordHash).not.toBe(createData.password);
        expect(user!.passwordHash!.length).toBeGreaterThan(50); // Bcrypt hash length
      });
    });

    describe('loginUser', () => {
      beforeEach(async () => {
        // Create test user
        await AuthService.createOrganization({
          organizationName: 'Login Service Corp',
          email: 'loginservice@corp.com',
          password: 'loginservicepass123',
          displayName: 'Login Service User'
        });
      });

      it('should authenticate user with valid credentials', async () => {
        const result = await AuthService.login({
          email: 'loginservice@corp.com',
          password: 'loginservicepass123'
        });

        expect(result).toHaveProperty('message', 'Login successful');
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('organization');

        expect(result.user.email).toBe('loginservice@corp.com');
        expect(result.user.role).toBe('owner');
      });

      it('should reject invalid email', async () => {
        await expect(AuthService.login({
          email: 'nonexistent@corp.com',
          password: 'loginservicepass123'
        })).rejects.toThrow('Invalid email or password');
      });

      it('should reject invalid password', async () => {
        await expect(AuthService.login({
          email: 'loginservice@corp.com',
          password: 'wrongpassword'
        })).rejects.toThrow('Invalid email or password');
      });

      it('should update lastLoginAt timestamp', async () => {
        const beforeLogin = new Date();
        
        await AuthService.login({
          email: 'loginservice@corp.com',
          password: 'loginservicepass123'
        });

        const user = await prisma.user.findFirst({
          where: { email: 'loginservice@corp.com' }
        });

        expect(user!.lastLoginAt).toBeTruthy();
        expect(user!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      });
    });

  });

  describe('ShipmentService', () => {
    let orgId: string;
    let userId: string;

    beforeEach(async () => {
      const authResult = await AuthService.createOrganization({
        organizationName: 'Shipment Service Corp',
        email: 'shipmentservice@corp.com',
        password: 'shipmentpass123',
        displayName: 'Shipment User'
      });

      orgId = authResult.organization.id;
      userId = authResult.user.id;
    });

    describe('createShipment', () => {
      const validShipmentData = {
        trackingNumber: 'SVC001',
        origin: 'Service City',
        destination: 'Test Town',
        weight: 20,
        pieces: 2,
        status: 'picked-up',
        company: 'Service Express'
      };

      it('should create shipment with valid data', async () => {
        const shipment = await ShipmentService.createShipment(
          validShipmentData,
          orgId,
          userId
        );

        expect(shipment).toEqual({
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

        // Verify database state
        const dbShipment = await prisma.shipment.findFirst({
          where: { trackingNumber: validShipmentData.trackingNumber }
        });

        expect(dbShipment).toBeTruthy();
        expect(dbShipment!.organizationId).toBe(orgId);
        expect(dbShipment!.createdByUserId).toBe(userId);
        expect(dbShipment!.currentStatus).toBe(validShipmentData.status);
      });

      it('should reject duplicate tracking numbers within organization', async () => {
        await ShipmentService.createShipment(validShipmentData, orgId, userId);

        await expect(ShipmentService.createShipment(validShipmentData, orgId, userId))
          .rejects.toThrow('already exists');
      });

      it('should allow same tracking number across different organizations', async () => {
        // Create shipment in first org
        await ShipmentService.createShipment(validShipmentData, orgId, userId);

        // Create second org
        const secondOrgResult = await AuthService.createOrganization({
          organizationName: 'Second Service Corp',
          email: 'second@service.com',
          password: 'secondpass123',
          displayName: 'Second User'
        });

        // Should not throw error
        const secondShipment = await ShipmentService.createShipment(
          validShipmentData,
          secondOrgResult.organization.id,
          secondOrgResult.user.id
        );

        expect(secondShipment.trackingNumber).toBe(validShipmentData.trackingNumber);
      });
    });

    describe('getOrganizationShipments', () => {
      beforeEach(async () => {
        // Create test shipments
        await ShipmentService.createShipment({
          trackingNumber: 'ORG001',
          origin: 'Alpha',
          destination: 'Beta',
          weight: 10,
          pieces: 1,
          status: 'delivered',
          company: 'Alpha Express'
        }, orgId, userId);

        await ShipmentService.createShipment({
          trackingNumber: 'ORG002',
          origin: 'Gamma',
          destination: 'Delta',
          weight: 15,
          pieces: 2,
          status: 'in-transit',
          company: 'Beta Shipping'
        }, orgId, userId);
      });

      it('should return all shipments for organization', async () => {
        const shipments = await ShipmentService.getOrganizationShipments(orgId);

        expect(shipments).toHaveLength(2);
        
        const trackingNumbers = shipments.map(s => s.trackingNumber);
        expect(trackingNumbers).toContain('ORG001');
        expect(trackingNumbers).toContain('ORG002');

        shipments.forEach(shipment => {
          expect(shipment).toHaveProperty('id');
          expect(shipment).toHaveProperty('travelHistory');
          expect(Array.isArray(shipment.travelHistory)).toBe(true);
        });
      });

      it('should only return shipments from specified organization', async () => {
        // Create second organization with different shipments
        const secondOrgResult = await AuthService.createOrganization({
          organizationName: 'Isolation Service Corp',
          email: 'isolation@service.com',
          password: 'isolationpass123',
          displayName: 'Isolation User'
        });

        await ShipmentService.createShipment({
          trackingNumber: 'ISOLATED001',
          origin: 'Isolated',
          destination: 'Separate',
          weight: 5,
          pieces: 1,
          status: 'picked-up',
          company: 'Isolation Express'
        }, secondOrgResult.organization.id, secondOrgResult.user.id);

        // First org should only see its own shipments
        const firstOrgShipments = await ShipmentService.getOrganizationShipments(orgId);
        const trackingNumbers = firstOrgShipments.map(s => s.trackingNumber);
        
        expect(trackingNumbers).not.toContain('ISOLATED001');
        expect(firstOrgShipments).toHaveLength(2);
      });
    });

    describe('addTravelEvent', () => {
      let shipmentId: string;

      beforeEach(async () => {
        const shipment = await ShipmentService.createShipment({
          trackingNumber: 'EVENT001',
          origin: 'Event Start',
          destination: 'Event End',
          weight: 12,
          pieces: 1,
          status: 'picked-up',
          company: 'Event Express'
        }, orgId, userId);

        shipmentId = shipment.id;
      });

      const validEventData = {
        status: 'in-transit',
        location: 'Event Hub',
        description: 'Package processed',
        eventType: 'in-transit' as const
      };

      it('should add travel event and update shipment status', async () => {
        const event = await ShipmentService.addTravelEvent(
          shipmentId,
          orgId,
          validEventData
        );

        expect(event).toEqual({
          id: expect.any(String),
          status: validEventData.status,
          location: validEventData.location,
          description: validEventData.description,
          timestamp: expect.any(Date),
          type: validEventData.eventType
        });

        // Verify shipment status was updated
        const updatedShipment = await prisma.shipment.findUnique({
          where: { id: shipmentId }
        });

        expect(updatedShipment!.currentStatus).toBe(validEventData.status);
        expect(updatedShipment!.updatedAt.getTime()).toBeGreaterThan(
          updatedShipment!.createdAt.getTime()
        );
      });

      it('should reject access to shipments from other organizations', async () => {
        // Create second organization
        const secondOrgResult = await AuthService.createOrganization({
          organizationName: 'Event Isolation Corp',
          email: 'eventisolation@service.com',
          password: 'eventpass123',
          displayName: 'Event User'
        });

        await expect(ShipmentService.addTravelEvent(
          shipmentId,
          secondOrgResult.organization.id,
          validEventData
        )).rejects.toThrow('Shipment not found');
      });

      it('should throw error for non-existent shipment', async () => {
        await expect(ShipmentService.addTravelEvent(
          'non-existent-id',
          orgId,
          validEventData
        )).rejects.toThrow('Shipment not found');
      });
    });

    describe('getByTrackingNumber', () => {
      beforeEach(async () => {
        // Create shipment with travel events
        const shipment = await ShipmentService.createShipment({
          trackingNumber: 'TRACK_SVC001',
          origin: 'Track Start',
          destination: 'Track End',
          weight: 8,
          pieces: 1,
          status: 'picked-up',
          company: 'Track Express'
        }, orgId, userId);

        await ShipmentService.addTravelEvent(shipment.id, orgId, {
          status: 'in-transit',
          location: 'Track Hub',
          description: 'Scanned at facility',
          eventType: 'in-transit'
        });

        await ShipmentService.addTravelEvent(shipment.id, orgId, {
          status: 'delivered',
          location: 'Track Destination',
          description: 'Delivered successfully',
          eventType: 'delivered'
        });
      });

      it('should return shipment with travel history', async () => {
        const shipment = await ShipmentService.getByTrackingNumber('TRACK_SVC001');

        expect(shipment).toBeTruthy();
        expect(shipment).toEqual({
          id: expect.any(String),
          trackingNumber: 'TRACK_SVC001',
          origin: 'Track Start',
          destination: 'Track End',
          weight: 8,
          pieces: 1,
          status: 'delivered', // Updated by latest event
          company: 'Track Express',
          travelHistory: expect.arrayContaining([
            expect.objectContaining({
              status: 'in-transit',
              location: 'Track Hub',
              description: 'Scanned at facility',
              type: 'in-transit'
            }),
            expect.objectContaining({
              status: 'delivered',
              location: 'Track Destination',
              description: 'Delivered successfully',
              type: 'delivered'
            })
          ])
        });

        expect(shipment?.travelHistory).toHaveLength(2);
        
        // Verify events are sorted by timestamp (most recent first)
        if (shipment?.travelHistory) {
          const timestamps = shipment.travelHistory.map(e => new Date(e.timestamp).getTime());
          expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
        }
      });

      it('should return null for non-existent tracking number', async () => {
        const shipment = await ShipmentService.getByTrackingNumber('NONEXISTENT');
        expect(shipment).toBeNull();
      });

      it('should work across organizations (public method)', async () => {
        // Create second org with shipment
        const secondOrgResult = await AuthService.createOrganization({
          organizationName: 'Public Track Corp',
          email: 'publictrack@service.com',
          password: 'publicpass123',
          displayName: 'Public User'
        });

        await ShipmentService.createShipment({
          trackingNumber: 'PUBLIC_SVC001',
          origin: 'Public Start',
          destination: 'Public End',
          weight: 6,
          pieces: 1,
          status: 'picked-up',
          company: 'Public Express'
        }, secondOrgResult.organization.id, secondOrgResult.user.id);

        // Should find shipment from any organization
        const shipment = await ShipmentService.getByTrackingNumber('PUBLIC_SVC001');
        expect(shipment).toBeTruthy();
        expect(shipment?.trackingNumber).toBe('PUBLIC_SVC001');
      });
    });
  });
});