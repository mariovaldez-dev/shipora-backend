import { HttpException, HttpStatus } from '@nestjs/common';

export class AlreadyMemberException extends HttpException {
  constructor() {
    super('Already a member of this organization', HttpStatus.CONFLICT);
  }
}
