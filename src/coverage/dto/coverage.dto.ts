import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
  Min,
  Max,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CoverageZoneType,
  CoverageZoneStatus,
  PricingType,
  ServiceStatus,
} from '../entities/coverage-zone.entity';

// ==================== Embedded DTOs ====================

export class CoordinatesDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class DayScheduleDto {
  @IsBoolean()
  isOpen: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format',
  })
  openTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format',
  })
  closeTime?: string;
}

export class WeekScheduleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  monday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  tuesday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  wednesday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  thursday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  friday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  saturday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  sunday?: DayScheduleDto;
}

export class ZonePricingDto {
  @IsEnum(PricingType)
  type: PricingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flatRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalPerKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  volumetricFactor?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  perKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fuelSurcharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  insuranceRate?: number;

  @IsString()
  currency: string;
}

export class MaxDimensionsDto {
  @IsNumber()
  @Min(1)
  length: number;

  @IsNumber()
  @Min(1)
  width: number;

  @IsNumber()
  @Min(1)
  height: number;
}

// ==================== Coverage Service DTO ====================

export class CreateCoverageServiceDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Code must be lowercase alphanumeric with underscores',
  })
  code: string;

  @IsNumber()
  @Min(0)
  minDeliveryDays: number;

  @IsNumber()
  @Min(0)
  maxDeliveryDays: number;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format',
  })
  cutoffTime?: string;

  @ValidateNested()
  @Type(() => ZonePricingDto)
  pricing: ZonePricingDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}

// ==================== Main Create DTO ====================

export class CreateCoverageZoneDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Code must be uppercase alphanumeric with hyphens',
  })
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CoverageZoneType)
  type: CoverageZoneType;

  // Type-specific fields
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{5}$/, { each: true, message: 'Postal codes must be 5 digits' })
  postalCodes?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  polygon?: CoordinatesDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  center?: CoordinatesDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusKm?: number;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // Services
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateCoverageServiceDto)
  services: CreateCoverageServiceDto[];

  // Restrictions
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  maxWeight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaxDimensionsDto)
  maxDimensions?: MaxDimensionsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedItems?: string[];

  // Schedules
  @IsOptional()
  @ValidateNested()
  @Type(() => WeekScheduleDto)
  pickupSchedule?: WeekScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeekScheduleDto)
  deliverySchedule?: WeekScheduleDto;

  // Status
  @IsOptional()
  @IsEnum(CoverageZoneStatus)
  status?: CoverageZoneStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;
}

// ==================== Update DTO ====================

export class UpdateCoverageZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postalCodes?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  polygon?: CoordinatesDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  center?: CoordinatesDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  radiusKm?: number;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCoverageServiceDto)
  services?: CreateCoverageServiceDto[];

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  maxWeight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaxDimensionsDto)
  maxDimensions?: MaxDimensionsDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restrictedItems?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WeekScheduleDto)
  pickupSchedule?: WeekScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeekScheduleDto)
  deliverySchedule?: WeekScheduleDto;

  @IsOptional()
  @IsEnum(CoverageZoneStatus)
  status?: CoverageZoneStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  priority?: number;
}

// ==================== Query DTO ====================

export class QueryCoverageZonesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CoverageZoneStatus)
  status?: CoverageZoneStatus;

  @IsOptional()
  @IsEnum(CoverageZoneType)
  type?: CoverageZoneType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ==================== Coverage Check DTO ====================

export class CheckCoverageDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Postal code must be 5 digits' })
  postalCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

// ==================== Rate Calculation DTO ====================

export class CalculateRateDto {
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Origin postal code must be 5 digits' })
  originPostalCode: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Destination postal code must be 5 digits' })
  destinationPostalCode: string;

  @IsNumber()
  @Min(0.01)
  weight: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @IsOptional()
  @IsBoolean()
  includeInsurance?: boolean;
}

// ==================== Postal Codes Management DTO ====================

export class PostalCodesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^\d{5}$/, { each: true, message: 'Postal codes must be 5 digits' })
  postalCodes: string[];
}

// ==================== Bulk Operations DTO ====================

export class BulkStatusUpdateDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  zoneIds: string[];

  @IsEnum(CoverageZoneStatus)
  status: CoverageZoneStatus;
}
