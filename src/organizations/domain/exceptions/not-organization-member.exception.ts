import { HttpException, HttpStatus } from '@nestjs/common';

export class NotOrganizationMemberException extends HttpException {
  constructor() {
    super('Not a member of this organization', HttpStatus.FORBIDDEN);
  }
}
