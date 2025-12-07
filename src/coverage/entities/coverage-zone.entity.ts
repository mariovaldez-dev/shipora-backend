import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Enums
export enum CoverageZoneType {
  POSTAL_CODES = 'postal_codes',
  STATE = 'state',
  CITY = 'city',
  RADIUS = 'radius',
  POLYGON = 'polygon',
}

export enum CoverageZoneStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PricingType {
  FLAT = 'flat',
  WEIGHT = 'weight',
  VOLUME = 'volume',
  DISTANCE = 'distance',
}

// Embedded Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: { start: string; end: string }[];
}

export interface WeekSchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface ZonePricing {
  type: PricingType;
  flatRate?: number;
  baseRate?: number;
  baseWeight?: number;
  additionalPerKg?: number;
  volumetricFactor?: number;
  perKm?: number;
  minCharge?: number;
  fuelSurcharge?: number;
  insuranceRate?: number;
  currency: string;
}

export interface MaxDimensions {
  length: number;
  width: number;
  height: number;
}

// Coverage Service Schema (embedded)
@Schema({ _id: true })
export class ZoneService {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, default: 1 })
  minDeliveryDays: number;

  @Prop({ required: true, default: 3 })
  maxDeliveryDays: number;

  @Prop()
  cutoffTime?: string;

  @Prop({ type: Object, required: true })
  pricing: ZonePricing;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({
    type: String,
    enum: Object.values(ServiceStatus),
    default: ServiceStatus.ACTIVE,
  })
  status: ServiceStatus;
}

export const ZoneServiceSchema = SchemaFactory.createForClass(ZoneService);

// Main Coverage Zone Schema
@Schema({ timestamps: true, collection: 'coverage_zones' })
export class CoverageZone extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, uppercase: true })
  code: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(CoverageZoneType),
    required: true,
  })
  type: CoverageZoneType;

  // Type-specific fields
  @Prop({ type: [String], default: [], index: true })
  postalCodes: string[];

  @Prop({ type: [{ lat: Number, lng: Number }], default: [] })
  polygon: Coordinates[];

  @Prop({ type: { lat: Number, lng: Number } })
  center?: Coordinates;

  @Prop()
  radiusKm?: number;

  @Prop({ index: true })
  state?: string;

  @Prop({ index: true })
  city?: string;

  // Services configuration
  @Prop({ type: [ZoneServiceSchema], default: [] })
  services: ZoneService[];

  // Restrictions
  @Prop({ default: 30 })
  maxWeight?: number;

  @Prop({ type: Object })
  maxDimensions?: MaxDimensions;

  @Prop({ type: [String], default: [] })
  restrictedItems: string[];

  // Schedules
  @Prop({ type: Object })
  pickupSchedule?: WeekSchedule;

  @Prop({ type: Object })
  deliverySchedule?: WeekSchedule;

  // Status and priority
  @Prop({
    type: String,
    enum: Object.values(CoverageZoneStatus),
    default: CoverageZoneStatus.ACTIVE,
    index: true,
  })
  status: CoverageZoneStatus;

  @Prop({ default: 1 })
  priority: number;

  // Timestamps (auto-generated)
  createdAt: Date;
  updatedAt: Date;
}

export const CoverageZoneSchema = SchemaFactory.createForClass(CoverageZone);

// Indexes for efficient queries
CoverageZoneSchema.index({ organizationId: 1, code: 1 }, { unique: true });
CoverageZoneSchema.index({ organizationId: 1, status: 1 });
CoverageZoneSchema.index({ organizationId: 1, type: 1 });
CoverageZoneSchema.index({ postalCodes: 1 });
CoverageZoneSchema.index({ state: 1, city: 1 });
CoverageZoneSchema.index({ 'center.lat': 1, 'center.lng': 1 });
