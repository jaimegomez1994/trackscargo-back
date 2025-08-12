import { ShipmentRepository } from '../repositories/shipment.repository';
import { OrganizationRepository } from '../repositories/organization.repository';
import { generateTrackingNumber } from '../utils/trackingNumber';
import type { 
  CreateShipmentDTO, 
  UpdateShipmentDTO, 
  CreateTravelEventDTO, 
  ShipmentResponse, 
  TravelEventResponse 
} from '../types/shipment.types';

export class ShipmentService {
  // Public method - for tracking (no auth required)
  static async getByTrackingNumber(trackingNumber: string): Promise<ShipmentResponse | null> {
    const shipment = await ShipmentRepository.findByTrackingNumber(trackingNumber);
    
    if (!shipment) {
      return null;
    }

    return this.formatShipmentResponse(shipment);
  }

  // Organization-scoped methods (require auth)
  static async getOrganizationShipments(organizationId: string): Promise<ShipmentResponse[]> {
    const shipments = await ShipmentRepository.findByOrganization(organizationId);
    return shipments.map(shipment => this.formatShipmentResponse(shipment));
  }

  static async createShipment(
    data: CreateShipmentDTO, 
    organizationId: string, 
    createdByUserId: string
  ): Promise<ShipmentResponse> {
    // Get organization details to generate prefixed tracking number
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // Generate the full tracking number with organization prefix
    const fullTrackingNumber = generateTrackingNumber(organization.name, data.trackingNumber);

    // Check if tracking number already exists within this organization
    const existingShipment = await ShipmentRepository.findByTrackingNumberAndOrganization(
      fullTrackingNumber, 
      organizationId
    );
    if (existingShipment) {
      throw new Error('Tracking number already exists in your organization');
    }

    const shipment = await ShipmentRepository.create({
      trackingNumber: fullTrackingNumber,
      organizationId,
      origin: data.origin,
      destination: data.destination,
      weight: data.weight,
      pieces: data.pieces,
      currentStatus: data.status,
      company: data.company,
      createdByUserId
    });

    // Get shipment with travel events for response
    const shipmentWithEvents = await ShipmentRepository.findByIdAndOrganization(
      shipment.id, 
      organizationId
    );

    return this.formatShipmentResponse(shipmentWithEvents!);
  }

  static async updateShipment(
    shipmentId: string,
    organizationId: string,
    data: UpdateShipmentDTO
  ): Promise<ShipmentResponse | null> {
    const updatedShipment = await ShipmentRepository.update(shipmentId, organizationId, data);
    
    if (!updatedShipment) {
      return null;
    }

    const shipmentWithEvents = await ShipmentRepository.findByIdAndOrganization(
      shipmentId, 
      organizationId
    );

    return shipmentWithEvents ? this.formatShipmentResponse(shipmentWithEvents) : null;
  }

  static async addTravelEvent(
    shipmentId: string,
    organizationId: string,
    data: CreateTravelEventDTO,
    createdByUserId?: string
  ): Promise<TravelEventResponse> {
    // Verify shipment belongs to organization
    const shipment = await ShipmentRepository.findByIdAndOrganization(shipmentId, organizationId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    // Add travel event
    const travelEvent = await ShipmentRepository.addTravelEvent(shipmentId, {
      status: data.status,
      location: data.location,
      description: data.description || '',
      timestamp: new Date(),
      eventType: data.eventType,
      createdByUserId
    });

    // Update shipment current status
    await ShipmentRepository.updateStatus(shipmentId, data.status);

    return {
      id: travelEvent.id,
      status: travelEvent.status,
      location: travelEvent.location,
      description: travelEvent.description,
      timestamp: travelEvent.timestamp.toISOString(),
      type: travelEvent.eventType
    };
  }

  private static formatShipmentResponse(shipment: any): ShipmentResponse {
    return {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      origin: shipment.origin,
      destination: shipment.destination,
      weight: shipment.weight,
      pieces: shipment.pieces,
      status: shipment.currentStatus,
      company: shipment.company,
      travelHistory: shipment.travelEvents?.map((event: any) => ({
        id: event.id,
        status: event.status,
        location: event.location,
        description: event.description,
        timestamp: event.timestamp.toISOString(),
        type: event.eventType
      })) || []
    };
  }
}