import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsObject,
  IsBoolean,
  IsEnum,
  ArrayNotEmpty,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuideStatus } from '../../entities/guide.entity';

// DTO for Address
export class GuideAddressDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  contactName: string;

  @IsString()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  street: string;

  @IsString()
  exteriorNumber: string;

  @IsOptional()
  @IsString()
  interiorNumber?: string;

  @IsString()
  neighborhood: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zipCode: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

// DTO for Dimensions
export class GuideDimensionsDto {
  @IsNumber()
  length: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;
}

// DTO for Product
export class GuideProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  weight: number;

  @ValidateNested()
  @Type(() => GuideDimensionsDto)
  dimensions: GuideDimensionsDto;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  satCode?: string;

  @IsBoolean()
  isFragile: boolean;
}

// DTO for Carrier
export class GuideCarrierDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  serviceType: string;

  @IsOptional()
  @IsString()
  logo?: string;
}

// DTO for Pricing
export class GuidePricingDto {
  @IsNumber()
  basePrice: number;

  @IsNumber()
  insurance: number;

  @IsNumber()
  fuel: number;

  @IsNumber()
  handling: number;

  @IsNumber()
  total: number;

  @IsString()
  currency: string;
}

// Create Guide DTO
export class CreateGuideDto {
  @IsString()
  trackingNumber: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @ValidateNested()
  @Type(() => GuideCarrierDto)
  carrier: GuideCarrierDto;

  @ValidateNested()
  @Type(() => GuideAddressDto)
  origin: GuideAddressDto;

  @ValidateNested()
  @Type(() => GuideAddressDto)
  destination: GuideAddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuideProductDto)
  products?: GuideProductDto[];

  @IsNumber()
  weight: number;

  @IsNumber()
  volumetricWeight: number;

  @IsNumber()
  chargeableWeight: number;

  @ValidateNested()
  @Type(() => GuideDimensionsDto)
  dimensions: GuideDimensionsDto;

  @ValidateNested()
  @Type(() => GuidePricingDto)
  pricing: GuidePricingDto;

  @IsOptional()
  @IsString()
  labelUrl?: string;

  @IsOptional()
  @IsString()
  labelBase64?: string;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @IsOptional()
  @IsString()
  carrierTrackingNumber?: string;

  @IsOptional()
  @IsString()
  carrierOrderId?: string;

  @IsOptional()
  @IsObject()
  carrierMetadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  priority?: string;
}

// Command used by application layer
export interface CreateGuideCommand extends CreateGuideDto {
  userId: string;
}

// Update Status DTO
export class UpdateGuideStatusDto {
  @IsEnum(GuideStatus)
  status: GuideStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

// Update Priority DTO
export class UpdateGuidePriorityDto {
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority: string;
}

// Batch Operation DTO
export class BatchGuideOperationDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  guideIds: string[];
}

// Batch Status Update DTO
export class BatchUpdateStatusDto extends BatchGuideOperationDto {
  @IsEnum(GuideStatus)
  status: GuideStatus;
}

// Filter DTO for listing guides
export class GuideFilterDto {
  @IsOptional()
  @IsEnum(GuideStatus)
  status?: GuideStatus;

  @IsOptional()
  @IsString()
  carrierId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsBoolean()
  isPrinted?: boolean;

  @IsOptional()
  @IsBoolean()
  isShipped?: boolean;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  skip?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

// Add Tracking Event DTO
export class AddTrackingEventDto {
  @IsString()
  status: string;

  @IsString()
  location: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  carrierStatus?: string;
}

// Warehouse Notes DTO
export class UpdateWarehouseNotesDto {
  @IsString()
  notes: string;
}
