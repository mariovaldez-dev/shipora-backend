/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Inject, Injectable } from '@nestjs/common';
import { type IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@users/domain/repositories/constants';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.userRepository.delete(id);
  }
}
