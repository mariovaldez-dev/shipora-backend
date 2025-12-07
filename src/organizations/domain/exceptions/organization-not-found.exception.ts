import { HttpException, HttpStatus } from '@nestjs/common';

export class OrganizationNotFoundException extends HttpException {
  constructor(identifier: string) {
    super(
      `Organization with identifier "${identifier}" not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}
