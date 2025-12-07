/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '@users/domain/repositories/constants';
import type { IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { ROLE_REPOSITORY } from '@roles/domain/repositories/role.repository.interface';
import type { IRoleRepository } from '@roles/domain/repositories/role.repository.interface';
import { Role } from '@modules/users/domain/entities/user.entity';

@Injectable()
export class AssignRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
  ) {}

  async execute(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const role = await this.roleRepository.findById(roleId);
    if (!role) throw new Error('Role not found');

    user.assignRole(roleId as Role);
    await this.userRepository.update(userId, user);
  }
}
