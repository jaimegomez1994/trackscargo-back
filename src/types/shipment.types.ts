export interface CreateShipmentDTO {
  trackingNumber: string;
  origin: string;
  destination: string;
  weight?: number;
  weightUnit?: string;
  pieces: number;
  status: string;
  company?: string;
  gpsTrackingUrl?: string;
  trailer?: string;
  pickupDate?: string;
  deliveryDate?: string;
}

export interface UpdateShipmentDTO {
  origin?: string;
  destination?: string;
  weight?: number;
  weightUnit?: string;
  pieces?: number;
  currentStatus?: string;
  company?: string;
  gpsTrackingUrl?: string;
  trailer?: string;
  pickupDate?: string;
  deliveryDate?: string;
}

export interface CreateTravelEventDTO {
  status: string;
  location: string;
  description?: string;
  eventType: 'picked-up' | 'in-transit' | 'delivered' | 'exception' | 'out-for-delivery' | 'attempted-delivery' | 'at-facility' | 'customs-clearance' | 'returned';
}

export interface UpdateTravelEventDTO {
  status?: string;
  location?: string;
  description?: string;
  timestamp?: string;
  eventType?: 'picked-up' | 'in-transit' | 'delivered' | 'exception' | 'out-for-delivery' | 'attempted-delivery' | 'at-facility' | 'customs-clearance' | 'returned';
}

export interface ShipmentResponse {
  id: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  weight: number;
  weightUnit: string;
  pieces: number;
  status: string;
  company?: string | null;
  gpsTrackingUrl?: string | null;
  trailer?: string | null;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  travelHistory?: TravelEventResponse[];
}

export interface TravelEventResponse {
  id: string;
  status: string;
  location: string;
  description: string;
  timestamp: string;
  type: string;
}