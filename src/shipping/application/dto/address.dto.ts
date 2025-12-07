import { Optional } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  municipality: string;

  @IsString()
  @IsNotEmpty()
  colony: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  clientName: string;

  @Optional()
  reference?: string;

  @Optional()
  rfc?: string;

  @Optional()
  email?: string;

  @Optional()
  contactName?: string;

  @IsString()
  @IsNotEmpty()
  addressType: 'ORIGIN' | 'DESTINATION';
}
