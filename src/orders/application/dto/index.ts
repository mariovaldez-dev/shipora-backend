import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsObject,
  ArrayNotEmpty,
} from 'class-validator';
// Removed unused imports

export class CreateSalesOrderDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;
  @IsArray()
  @ArrayNotEmpty()
  items: any[];

  @IsObject()
  shippingFrom: Record<string, any>;

  @IsObject()
  shippingTo: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  rateMasterId?: string;
}

// Command used by application layer (includes authenticated user info)
export interface CreateSalesOrderCommand extends CreateSalesOrderDto {
  userId: string;
  userName: string;
  orderNumber: string;
  metadata: any;
  rateMasterId?: string;
}

export class CreateShipmentDto {
  @IsString()
  orderId!: string;

  @IsString()
  carrier!: string;

  @IsString()
  trackingNumber!: string;

  @IsNumber()
  cost!: number;

  @IsOptional()
  @IsString()
  labelUrl?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class RateQueryDto {
  @IsString()
  originCountry!: string;

  @IsOptional()
  @IsString()
  originCity?: string;

  @IsString()
  destinationCountry!: string;

  @IsOptional()
  @IsString()
  destinationCity?: string;

  @IsNumber()
  weight!: number;

  @IsNumber()
  length!: number;

  @IsNumber()
  width!: number;

  @IsNumber()
  height!: number;

  @IsNumber()
  declaredValue!: number;

  @IsArray()
  quotes!: any[];

  @IsOptional()
  @IsNumber()
  requestDuration?: number;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

// Command used when recording a rate query (includes user info + request metadata)
export interface RateQueryCommand extends RateQueryDto {
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}

export class UpdateOrderStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
