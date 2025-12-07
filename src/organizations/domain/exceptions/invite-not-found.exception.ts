import { HttpException, HttpStatus } from '@nestjs/common';

export class InviteNotFoundException extends HttpException {
  constructor() {
    super('Invitation not found or expired', HttpStatus.NOT_FOUND);
  }
}
