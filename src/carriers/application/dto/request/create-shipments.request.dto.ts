import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from '@modules/shipping/application/dto/address.dto';
import { ProductDto } from '@modules/shipping/application/dto/product.dto';
import { ShipmentRate } from '@modules/carriers/domain/carrier.interface';

export class CreateShipmentRequestDto {
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  from: AddressDto;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  to: AddressDto;

  @IsArray()
  @Type(() => ProductDto)
  products: ProductDto[];

  @IsArray()
  rates: ShipmentRate[];

  @IsString()
  @IsNotEmpty()
  userKey: string;
}
