import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum OrderSource {
  API = 'API',
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  WEBHOOK = 'WEBHOOK',
  BATCH = 'BATCH',
}

export interface OrderMetadata {
  userAgent?: string;
  ipAddress?: string;
  source: OrderSource;
  referer?: string;
}

export interface OrderItem {
  description: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  value: number;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

@Schema({ timestamps: true })
export class SalesOrder extends MongooseDocument {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userName: string;

  @Prop({
    required: true,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop({ type: Object, required: true })
  metadata: OrderMetadata;

  @Prop({ type: Object, required: true })
  items: OrderItem[];

  @Prop({ type: Object, required: true })
  shippingFrom: ShippingAddress;

  @Prop({ type: Object, required: true })
  shippingTo: ShippingAddress;

  @Prop()
  preferredCarrier?: string;

  @Prop()
  selectedCarrier?: string;

  @Prop()
  selectedRate?: string;

  @Prop({ index: true })
  rateMasterId?: string;

  @Prop({ default: 0 })
  shippingCost: number;

  @Prop({ default: 0 })
  totalValue: number;

  @Prop([String])
  shipmentIds: string[];

  @Prop()
  notes?: string;

  @Prop()
  requestedAt: Date;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelReason?: string;
}

export const SalesOrderSchema = SchemaFactory.createForClass(SalesOrder);
SalesOrderSchema.index({ userId: 1, createdAt: -1 });
SalesOrderSchema.index({ orderNumber: 1 });
SalesOrderSchema.index({ status: 1 });
SalesOrderSchema.index({ 'shippingTo.country': 1 });
