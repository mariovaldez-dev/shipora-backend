import { HttpException, HttpStatus } from '@nestjs/common';

export class OrganizationSlugExistsException extends HttpException {
  constructor(slug: string) {
    super(
      `Organization with slug "${slug}" already exists`,
      HttpStatus.CONFLICT,
    );
  }
}
