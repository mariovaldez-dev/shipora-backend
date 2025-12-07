import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/infrastructure/guards/jwt-auth.guard';
import { CreateRoleDto } from '@roles/application/dto/create-role.dto';
import { ROLE_REPOSITORY } from '@roles/domain/repositories/role.repository.interface';
import type { IRoleRepository } from '@roles/domain/repositories/role.repository.interface';
import { Role, Permission } from '@roles/domain/entities/role.entity';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = new Role({
      name: createRoleDto.name,
      description: createRoleDto.description,
      permissions: createRoleDto.permissions as Permission[],
    });

    const created = await this.roleRepository.create(role);
    return {
      id: created.id,
      name: created.name,
      description: created.description,
      permissions: created.permissions,
    };
  }

  @Get()
  async findAll() {
    const roles = await this.roleRepository.findAll();
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      createdAt: role.createdAt,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new Error('Role not found');
    }
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
