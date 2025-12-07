import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { LoginDto } from '../dto/login.dto';
import { USER_REPOSITORY } from '@users/domain/repositories/constants';
import { type IRoleRepository } from '@roles/domain/repositories/role.repository.interface';
import { ROLE_REPOSITORY } from '@roles/domain/repositories/role.repository.interface';
import { Permission } from '@roles/domain/entities/role.entity';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await user.password.compare(dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Consolidar permisos de todos los roles del usuario
    const userRoles = await Promise.all(
      user.roles.map((roleName) => this.roleRepository.findByName(roleName)),
    );

    const permissions = userRoles.reduce((acc, role) => {
      if (role) {
        role.permissions.forEach((p) => acc.add(p));
      }
      return acc;
    }, new Set<Permission>());

    const payload = {
      sub: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: Array.from(permissions),
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
