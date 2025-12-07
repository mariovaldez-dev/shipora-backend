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

export class GetRatesDto {
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

  @IsString()
  @IsNotEmpty()
  userKey: string;
}
