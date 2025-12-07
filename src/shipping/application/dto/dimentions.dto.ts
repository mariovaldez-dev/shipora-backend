import { IsNumber, IsPositive } from 'class-validator';

export class DimensionsDto {
  @IsNumber()
  @IsPositive()
  length: number; // in centimeters

  @IsNumber()
  @IsPositive()
  width: number; // in centimeters

  @IsNumber()
  @IsPositive()
  height: number; // in centimeters

  @IsNumber()
  @IsPositive()
  weight: number; // in kilograms

  @IsNumber()
  @IsPositive()
  volume: number; // in cubic centimeters
}
