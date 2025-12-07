import { BaseEntity } from '@shared/domain/base.entity';

export enum Permission {
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  ASSIGN_ROLE = 'assign:role',
}

export class Role extends BaseEntity {
  name: string;
  description: string;
  permissions: Permission[];

  constructor(partial: Partial<Role>) {
    super(partial);

    Object.assign(this, partial);

    this.name = partial.name ?? '';
    this.description = partial.description ?? '';
    this.permissions = partial.permissions ?? [];
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  addPermission(permission: Permission): void {
    if (!this.hasPermission(permission)) {
      this.permissions.push(permission);
    }
  }
}
