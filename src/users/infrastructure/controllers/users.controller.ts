import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
  NotFoundException,
  Inject,
} from '@nestjs/common';

import { JwtAuthGuard } from '@auth/infrastructure/guards/jwt-auth.guard';

import { CreateUserUseCase } from '@users/application/use-cases/create-user.use-case';
import { AssignRoleUseCase } from '@users/application/use-cases/assign-role.use-case';
import { GetUserUseCase } from '@users/application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '@users/application/use-cases/list-users.use-case';
import { DeleteUserUseCase } from '@users/application/use-cases/delete-user.use-case';
import { CreateUserDto } from '@users/application/dto/create-user.dto';
import { AssignRoleDto } from '@modules/roles/application/dto/assign-role.dto';

import { type IUserRepository } from '@users/domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '@users/domain/repositories/constants';
import { Permission } from '@modules/roles/domain/entities/role.entity';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from '@modules/roles/domain/entities/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,

    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  // -----------------------
  // CREATE USER
  // -----------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(Permission.CREATE_USER)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(dto);

    return {
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles: user.roles,
      createdAt: user.createdAt,
    };
  }

  // -----------------------
  // LIST ALL USERS
  // -----------------------
  @Get()
  @Permissions(Permission.READ_USER)
  async findAll() {
    const users = await this.listUsersUseCase.execute();

    return users.map((user) => ({
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roles: user.roles,
      createdAt: user.createdAt,
    }));
  }

  // -----------------------
  // GET USER BY ID
  // -----------------------
  @Get(':id')
  @Permissions(Permission.READ_USER)
  async findOne(@Param('id') id: string) {
    const user = await this.getUserUseCase.execute(id);

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // -----------------------
  // ASSIGN ROLE
  // -----------------------
  @Put(':id/roles')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.ASSIGN_ROLE)
  async assignRole(
    @Param('id') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    await this.assignRoleUseCase.execute(userId, assignRoleDto.roleId);

    return { message: 'Role assigned successfully' };
  }

  // -----------------------
  // DELETE USER
  // -----------------------
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(Permission.DELETE_USER)
  async remove(@Param('id') id: string) {
    await this.deleteUserUseCase.execute(id);
    return;
  }
}
