import { prisma } from '../lib/prisma';
import type { Shipment, TravelEvent } from '@prisma/client';

export class ShipmentRepository {
  // Public method - no organization filter (for public tracking)
  static async findByTrackingNumber(trackingNumber: string): Promise<(Shipment & { travelEvents: TravelEvent[] }) | null> {
    return await prisma.shipment.findUnique({
      where: { trackingNumber },
      include: {
        travelEvents: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });
  }

  // Organization-scoped methods
  static async findByTrackingNumberAndOrganization(
    trackingNumber: string, 
    organizationId: string
  ): Promise<(Shipment & { travelEvents: TravelEvent[] }) | null> {
    return await prisma.shipment.findFirst({
      where: { 
        trackingNumber,
        organizationId 
      },
      include: {
        travelEvents: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });
  }

  static async findByOrganization(organizationId: string): Promise<(Shipment & { travelEvents: TravelEvent[] })[]> {
    return await prisma.shipment.findMany({
      where: { organizationId },
      include: {
        travelEvents: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async findByIdAndOrganization(
    id: string, 
    organizationId: string
  ): Promise<(Shipment & { travelEvents: TravelEvent[] }) | null> {
    return await prisma.shipment.findFirst({
      where: { 
        id,
        organizationId 
      },
      include: {
        travelEvents: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });
  }

  static async create(data: {
    trackingNumber: string;
    organizationId: string;
    origin: string;
    destination: string;
    weight: number;
    pieces: number;
    currentStatus: string;
    company?: string;
    createdByUserId: string;
  }): Promise<Shipment> {
    return await prisma.shipment.create({
      data
    });
  }

  static async update(
    id: string,
    organizationId: string,
    data: {
      origin?: string;
      destination?: string;
      weight?: number;
      pieces?: number;
      currentStatus?: string;
      company?: string;
    }
  ): Promise<Shipment | null> {
    return await prisma.shipment.updateMany({
      where: { 
        id,
        organizationId 
      },
      data
    }).then(result => 
      result.count > 0 ? prisma.shipment.findUnique({ where: { id } }) : null
    );
  }

  static async addTravelEvent(
    shipmentId: string,
    data: {
      status: string;
      location: string;
      description: string;
      timestamp: Date;
      eventType: string;
      createdByUserId?: string;
    }
  ): Promise<TravelEvent> {
    return await prisma.travelEvent.create({
      data: {
        shipmentId,
        ...data
      }
    });
  }

  static async updateStatus(shipmentId: string, status: string): Promise<Shipment> {
    return await prisma.shipment.update({
      where: { id: shipmentId },
      data: { currentStatus: status }
    });
  }
}