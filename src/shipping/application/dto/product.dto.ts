import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsPositive,
  IsString,
} from 'class-validator';
import { DimensionsDto } from './dimentions.dto';
import { Optional } from '@nestjs/common';

export class ProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string; // this can be the product's SKU or identifier from customer system

  @IsString()
  @IsNotEmpty()
  name: string; // this is the descriptive name of the product (can be real or generic)

  @IsNumber()
  @IsPositive()
  quantity: number; // number of units of this product

  @IsObject()
  @IsNotEmpty()
  dimensions: DimensionsDto; // dimensions of a single unit of the product

  @IsNumber()
  @IsNotEmpty()
  value: number; // in the specified currency

  @IsString()
  @IsNotEmpty()
  currency: string; // ISO 4217 currency code, e.g., 'USD', 'EUR', 'MXN' Default is 'MXN'

  @IsNotEmpty()
  @IsBoolean()
  requireAssurance: boolean; // indicates if the product requires insurance

  @IsNumber()
  @Optional()
  insuranceValue?: number; // value for insurance purposes

  @IsString()
  @Optional()
  satcode: string; // SAT code for customs declaration
}
