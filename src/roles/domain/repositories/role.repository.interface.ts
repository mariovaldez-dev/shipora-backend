import { IRepository } from '@shared/domain/repository.interface';
import { Role } from '../entities/role.entity';

export interface IRoleRepository extends IRepository<Role> {
  findByName(name: string): Promise<Role | null>;
}

export const ROLE_REPOSITORY = Symbol('ROLE_REPOSITORY');
