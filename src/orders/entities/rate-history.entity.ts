import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export interface RateQuote {
  carrier: string;
  serviceType?: string;
  price: number;
  estimatedDays: number;
  currency: string;
  rateId?: string;
}

@Schema({ timestamps: true })
export class RateHistory extends MongooseDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  masterRateId: string;

  @Prop({ required: true })
  originCountry: string;

  @Prop()
  originCity?: string;

  @Prop()
  originState?: string;

  @Prop()
  originZipCode?: string;

  @Prop()
  destinationCountry?: string;

  @Prop()
  destinationCity?: string;

  @Prop()
  destinationState?: string;

  @Prop()
  destinationZipCode?: string;

  @Prop({ default: 0 })
  weight: number;

  @Prop({ default: 0 })
  length: number;

  @Prop({ default: 0 })
  width: number;

  @Prop({ default: 0 })
  height: number;

  @Prop({ default: 0 })
  declaredValue: number;

  @Prop([Object])
  quotes: RateQuote[];

  @Prop()
  selectedCarrier?: string;

  @Prop()
  selectedPrice?: number;

  @Prop({ default: 0 })
  requestDuration: number;

  @Prop({ type: Types.ObjectId })
  orderId?: Types.ObjectId;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const RateHistorySchema = SchemaFactory.createForClass(RateHistory);
RateHistorySchema.index({ userId: 1, createdAt: -1 });
RateHistorySchema.index({ orderId: 1 });
RateHistorySchema.index({ originCountry: 1, destinationCountry: 1 });
