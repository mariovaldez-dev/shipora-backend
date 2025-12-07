/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
