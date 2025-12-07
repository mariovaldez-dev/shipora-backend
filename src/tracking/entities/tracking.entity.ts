import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Tracking Event Status
export enum TrackingStatus {
  // Orden creada
  CREATED = 'created',
  LABEL_GENERATED = 'label_generated',

  // En proceso de recolección
  PICKUP_SCHEDULED = 'pickup_scheduled',
  PICKUP_IN_PROGRESS = 'pickup_in_progress',
  PICKED_UP = 'picked_up',

  // En tránsito
  IN_TRANSIT = 'in_transit',
  ARRIVED_AT_ORIGIN_HUB = 'arrived_at_origin_hub',
  DEPARTED_ORIGIN_HUB = 'departed_origin_hub',
  IN_TRANSIT_TO_DESTINATION = 'in_transit_to_destination',
  ARRIVED_AT_DESTINATION_HUB = 'arrived_at_destination_hub',

  // En reparto
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERY_ATTEMPTED = 'delivery_attempted',

  // Entregado
  DELIVERED = 'delivered',
  DELIVERED_TO_NEIGHBOR = 'delivered_to_neighbor',
  DELIVERED_TO_RECEPTION = 'delivered_to_reception',

  // Problemas
  EXCEPTION = 'exception',
  RETURNED_TO_SENDER = 'returned_to_sender',
  LOST = 'lost',
  DAMAGED = 'damaged',

  // Cancelado
  CANCELLED = 'cancelled',
}

// Status categories for UI grouping
export enum TrackingStatusCategory {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  CANCELLED = 'cancelled',
}

// Mapping status to category
export const statusToCategory: Record<TrackingStatus, TrackingStatusCategory> =
  {
    [TrackingStatus.CREATED]: TrackingStatusCategory.PENDING,
    [TrackingStatus.LABEL_GENERATED]: TrackingStatusCategory.PENDING,
    [TrackingStatus.PICKUP_SCHEDULED]: TrackingStatusCategory.PENDING,
    [TrackingStatus.PICKUP_IN_PROGRESS]: TrackingStatusCategory.PENDING,
    [TrackingStatus.PICKED_UP]: TrackingStatusCategory.IN_TRANSIT,
    [TrackingStatus.IN_TRANSIT]: TrackingStatusCategory.IN_TRANSIT,
    [TrackingStatus.ARRIVED_AT_ORIGIN_HUB]: TrackingStatusCategory.IN_TRANSIT,
    [TrackingStatus.DEPARTED_ORIGIN_HUB]: TrackingStatusCategory.IN_TRANSIT,
    [TrackingStatus.IN_TRANSIT_TO_DESTINATION]:
      TrackingStatusCategory.IN_TRANSIT,
    [TrackingStatus.ARRIVED_AT_DESTINATION_HUB]:
      TrackingStatusCategory.IN_TRANSIT,
    [TrackingStatus.OUT_FOR_DELIVERY]: TrackingStatusCategory.OUT_FOR_DELIVERY,
    [TrackingStatus.DELIVERY_ATTEMPTED]:
      TrackingStatusCategory.OUT_FOR_DELIVERY,
    [TrackingStatus.DELIVERED]: TrackingStatusCategory.DELIVERED,
    [TrackingStatus.DELIVERED_TO_NEIGHBOR]: TrackingStatusCategory.DELIVERED,
    [TrackingStatus.DELIVERED_TO_RECEPTION]: TrackingStatusCategory.DELIVERED,
    [TrackingStatus.EXCEPTION]: TrackingStatusCategory.EXCEPTION,
    [TrackingStatus.RETURNED_TO_SENDER]: TrackingStatusCategory.EXCEPTION,
    [TrackingStatus.LOST]: TrackingStatusCategory.EXCEPTION,
    [TrackingStatus.DAMAGED]: TrackingStatusCategory.EXCEPTION,
    [TrackingStatus.CANCELLED]: TrackingStatusCategory.CANCELLED,
  };

// Human readable status names in Spanish
export const statusLabels: Record<TrackingStatus, string> = {
  [TrackingStatus.CREATED]: 'Orden creada',
  [TrackingStatus.LABEL_GENERATED]: 'Etiqueta generada',
  [TrackingStatus.PICKUP_SCHEDULED]: 'Recolección programada',
  [TrackingStatus.PICKUP_IN_PROGRESS]: 'Recolección en proceso',
  [TrackingStatus.PICKED_UP]: 'Recolectado',
  [TrackingStatus.IN_TRANSIT]: 'En tránsito',
  [TrackingStatus.ARRIVED_AT_ORIGIN_HUB]: 'En centro de distribución origen',
  [TrackingStatus.DEPARTED_ORIGIN_HUB]: 'Salió del centro de origen',
  [TrackingStatus.IN_TRANSIT_TO_DESTINATION]: 'En camino al destino',
  [TrackingStatus.ARRIVED_AT_DESTINATION_HUB]:
    'En centro de distribución destino',
  [TrackingStatus.OUT_FOR_DELIVERY]: 'En reparto',
  [TrackingStatus.DELIVERY_ATTEMPTED]: 'Intento de entrega fallido',
  [TrackingStatus.DELIVERED]: 'Entregado',
  [TrackingStatus.DELIVERED_TO_NEIGHBOR]: 'Entregado a vecino',
  [TrackingStatus.DELIVERED_TO_RECEPTION]: 'Entregado en recepción',
  [TrackingStatus.EXCEPTION]: 'Excepción en envío',
  [TrackingStatus.RETURNED_TO_SENDER]: 'Devuelto al remitente',
  [TrackingStatus.LOST]: 'Extraviado',
  [TrackingStatus.DAMAGED]: 'Dañado',
  [TrackingStatus.CANCELLED]: 'Cancelado',
};

// Location for tracking event
@Schema({ _id: false })
export class TrackingLocation {
  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  country?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  facility?: string; // Nombre del centro de distribución

  @Prop({ type: { lat: Number, lng: Number } })
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export const TrackingLocationSchema =
  SchemaFactory.createForClass(TrackingLocation);

// Individual tracking event
@Schema({ _id: true, timestamps: false })
export class TrackingEvent {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true, enum: TrackingStatus })
  status: TrackingStatus;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Date })
  timestamp: Date;

  @Prop({ type: TrackingLocationSchema })
  location?: TrackingLocation;

  @Prop()
  carrierStatus?: string; // Status original del carrier

  @Prop()
  carrierDescription?: string; // Descripción original del carrier

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  signedBy?: string; // Nombre de quien recibió (para entregas)

  @Prop()
  proofOfDelivery?: string; // URL de foto/firma de entrega
}

export const TrackingEventSchema = SchemaFactory.createForClass(TrackingEvent);

// Main Tracking Document
@Schema({ timestamps: true, collection: 'tracking' })
export class Tracking extends Document {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, unique: true, index: true })
  trackingNumber: string;

  @Prop({ index: true })
  carrierTrackingNumber?: string; // Número de guía del carrier externo

  @Prop({ type: Types.ObjectId, ref: 'Order', index: true })
  orderId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Guide', index: true })
  guideId?: Types.ObjectId;

  // Current status
  @Prop({
    required: true,
    enum: TrackingStatus,
    default: TrackingStatus.CREATED,
  })
  currentStatus: TrackingStatus;

  @Prop({ enum: TrackingStatusCategory })
  statusCategory: TrackingStatusCategory;

  // Carrier info
  @Prop({ required: true })
  carrier: string; // 'propio', 'fedex', 'dhl', 'paquete_express', etc.

  @Prop()
  carrierName: string; // Nombre legible

  @Prop()
  serviceType: string; // 'express', 'standard', etc.

  // Origin/Destination
  @Prop({ type: Object, required: true })
  origin: {
    name: string;
    company?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };

  @Prop({ type: Object, required: true })
  destination: {
    name: string;
    company?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };

  // Package info
  @Prop({ type: Object })
  package?: {
    weight: number;
    weightUnit: string;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    description?: string;
    declaredValue?: number;
    currency?: string;
  };

  // Timeline events
  @Prop({ type: [TrackingEventSchema], default: [] })
  events: TrackingEvent[];

  // Estimated delivery
  @Prop({ type: Date })
  estimatedDeliveryDate?: Date;

  @Prop({ type: Date })
  actualDeliveryDate?: Date;

  // Delivery proof
  @Prop()
  signatureUrl?: string;

  @Prop()
  photoUrl?: string;

  @Prop()
  signedBy?: string;

  // Notifications
  @Prop({ default: false })
  notifyBySms: boolean;

  @Prop({ default: true })
  notifyByEmail: boolean;

  @Prop({ type: [String], default: [] })
  notificationEmails: string[];

  @Prop({ type: [String], default: [] })
  notificationPhones: string[];

  // Webhook source tracking
  @Prop({ type: Date })
  lastWebhookUpdate?: Date;

  @Prop()
  webhookSource?: string;

  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}

export const TrackingSchema = SchemaFactory.createForClass(Tracking);

// Indexes
TrackingSchema.index({ organizationId: 1, currentStatus: 1 });
TrackingSchema.index({ organizationId: 1, createdAt: -1 });
TrackingSchema.index({ carrierTrackingNumber: 1, carrier: 1 });
TrackingSchema.index({ 'destination.email': 1 });
TrackingSchema.index({ estimatedDeliveryDate: 1 });
