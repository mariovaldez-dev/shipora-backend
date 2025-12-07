import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export enum GuideStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  EXCEPTION = 'EXCEPTION',
}

export interface GuideDimensions {
  length: number;
  width: number;
  height: number;
}

export interface GuideCarrier {
  id: string;
  name: string;
  serviceType: string;
  logo?: string;
}

export interface GuidePricing {
  basePrice: number;
  insurance: number;
  fuel: number;
  handling: number;
  total: number;
  currency: string;
}

export interface GuideProduct {
  sku: string;
  name: string;
  quantity: number;
  weight: number;
  dimensions: GuideDimensions;
  value: number;
  satCode?: string;
  isFragile: boolean;
}

export interface TrackingHistoryEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  carrierStatus?: string;
}

export interface GuideAddress {
  companyName?: string;
  contactName: string;
  email: string;
  phone: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  reference?: string;
}

@Schema({ timestamps: true })
export class Guide extends MongooseDocument {
  @Prop({ required: true, unique: true })
  trackingNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SalesOrder' })
  orderId?: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(GuideStatus),
    default: GuideStatus.PENDING,
  })
  status: GuideStatus;

  @Prop({ type: Object, required: true })
  carrier: GuideCarrier;

  @Prop({ type: Object, required: true })
  origin: GuideAddress;

  @Prop({ type: Object, required: true })
  destination: GuideAddress;

  @Prop({ type: [Object], default: [] })
  products: GuideProduct[];

  @Prop({ required: true, default: 0 })
  weight: number;

  @Prop({ required: true, default: 0 })
  volumetricWeight: number;

  @Prop({ required: true, default: 0 })
  chargeableWeight: number;

  @Prop({ type: Object, required: true })
  dimensions: GuideDimensions;

  @Prop({ type: Object, required: true })
  pricing: GuidePricing;

  @Prop()
  labelUrl?: string;

  @Prop()
  labelBase64?: string;

  @Prop()
  estimatedDelivery?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelReason?: string;

  @Prop({ type: [Object], default: [] })
  trackingHistory: TrackingHistoryEvent[];

  @Prop()
  carrierTrackingNumber?: string;

  @Prop()
  carrierOrderId?: string;

  @Prop({ type: Object })
  carrierMetadata?: Record<string, any>;

  // Warehouse management fields
  @Prop({ default: false })
  isPrinted: boolean;

  @Prop()
  printedAt?: Date;

  @Prop()
  printedBy?: string;

  @Prop({ default: false })
  isShipped: boolean;

  @Prop()
  shippedBy?: string;

  @Prop()
  warehouseNotes?: string;

  @Prop({ default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] })
  priority: string;
}

export const GuideSchema = SchemaFactory.createForClass(Guide);
GuideSchema.index({ userId: 1, createdAt: -1 });
GuideSchema.index({ trackingNumber: 1 });
GuideSchema.index({ orderId: 1 });
GuideSchema.index({ status: 1 });
GuideSchema.index({ 'carrier.id': 1 });
GuideSchema.index({ isPrinted: 1, isShipped: 1 });
GuideSchema.index({ priority: 1 });
