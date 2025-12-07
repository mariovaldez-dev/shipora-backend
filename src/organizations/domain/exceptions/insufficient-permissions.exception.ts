import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientPermissionsException extends HttpException {
  constructor(permission?: string) {
    super(
      permission
        ? `Insufficient permissions: ${permission} required`
        : 'Insufficient permissions',
      HttpStatus.FORBIDDEN,
    );
  }
}
