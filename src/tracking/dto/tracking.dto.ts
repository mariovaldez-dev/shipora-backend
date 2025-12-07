import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
  IsEmail,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrackingStatus } from '../entities/tracking.entity';

// ==================== Location DTO ====================

export class LocationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  facility?: string;
}

// ==================== Address DTO ====================

export class AddressDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Postal code must be 5 digits' })
  postalCode: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

// ==================== Dimensions DTO ====================

export class DimensionsDto {
  @IsNumber()
  @Min(1)
  length: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

// ==================== Package DTO ====================

export class PackageDto {
  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsOptional()
  @IsString()
  weightUnit?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

// ==================== Create Tracking DTO ====================

export class CreateTrackingDto {
  @IsOptional()
  @IsString()
  trackingNumber?: string; // Se genera automáticamente si no se proporciona

  @IsOptional()
  @IsString()
  carrierTrackingNumber?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  guideId?: string;

  @IsString()
  carrier: string;

  @IsOptional()
  @IsString()
  carrierName?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  origin: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  destination: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PackageDto)
  package?: PackageDto;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @IsOptional()
  @IsBoolean()
  notifyBySms?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notificationEmails?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationPhones?: string[];
}

// ==================== Add Event DTO ====================

export class AddTrackingEventDto {
  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsString()
  carrierStatus?: string;

  @IsOptional()
  @IsString()
  carrierDescription?: string;

  @IsOptional()
  @IsString()
  signedBy?: string;

  @IsOptional()
  @IsString()
  proofOfDelivery?: string;
}

// ==================== Webhook Event DTO ====================

export class WebhookEventDto {
  @IsString()
  carrier: string;

  @IsString()
  carrierTrackingNumber: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsString()
  signedBy?: string;

  @IsOptional()
  @IsString()
  proofOfDelivery?: string;

  @IsOptional()
  rawPayload?: Record<string, unknown>;
}

// ==================== Query DTOs ====================

export class QueryTrackingDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TrackingStatus)
  status?: TrackingStatus;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

// ==================== Update Notification Settings DTO ====================

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  notifyBySms?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notificationEmails?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationPhones?: string[];
}

// ==================== Public Tracking Response ====================

export class PublicTrackingResponseDto {
  trackingNumber: string;
  currentStatus: TrackingStatus;
  statusLabel: string;
  carrier: string;
  carrierName: string;
  serviceType?: string;
  origin: {
    city: string;
    state: string;
    country: string;
  };
  destination: {
    city: string;
    state: string;
    country: string;
  };
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  events: {
    status: TrackingStatus;
    statusLabel: string;
    description: string;
    timestamp: string;
    location?: {
      city?: string;
      state?: string;
    };
  }[];
  signedBy?: string;
}
