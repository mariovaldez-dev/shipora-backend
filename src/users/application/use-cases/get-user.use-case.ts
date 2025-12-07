/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Injectable } from '@nestjs/common';
import { type IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@users/domain/repositories/constants';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string) {
    return this.userRepository.findById(id);
  }
}
