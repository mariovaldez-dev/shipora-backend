import { Inject, Injectable } from '@nestjs/common';
import { type IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@users/domain/repositories/constants';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute() {
    return this.userRepository.findAll();
  }
}
