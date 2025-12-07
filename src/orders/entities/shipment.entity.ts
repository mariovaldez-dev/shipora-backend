import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export enum ShipmentStatus {
  PENDING = 'PENDING',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
  CANCELLED = 'CANCELLED',
}

export interface TrackingEvent {
  timestamp: Date;
  status: ShipmentStatus;
  location?: string;
  description: string;
}

@Schema({ timestamps: true })
export class Shipment extends MongooseDocument {
  @Prop({ required: true, unique: true })
  shiporaId: string;

  @Prop({ type: Types.ObjectId, required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  carrier: string;

  @Prop({ required: true })
  trackingNumber: string;

  @Prop({
    required: true,
    enum: Object.values(ShipmentStatus),
    default: ShipmentStatus.PENDING,
  })
  status: ShipmentStatus;

  @Prop([Object])
  trackingEvents: TrackingEvent[];

  @Prop({ required: true })
  cost: number;

  @Prop()
  labelUrl?: string;

  @Prop({ default: 0 })
  retryCount: number;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
ShipmentSchema.index({ userId: 1, createdAt: -1 });
ShipmentSchema.index({ shiporaId: 1 });
ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ trackingNumber: 1 });
