import { BaseEntity } from '@shared/domain/base.entity';
import { randomUUID } from 'crypto';

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'suspended';

export interface IMemberPermissions {
  canManageOrders?: boolean;
  canManageGuides?: boolean;
  canManageMembers?: boolean;
  canViewReports?: boolean;
  canManageBilling?: boolean;
  canManageSettings?: boolean;
  canManageIntegrations?: boolean;
}

export interface IOrganizationMemberProps {
  id?: string;
  organizationId: string;
  userId: string;
  role: MemberRole;
  permissions?: IMemberPermissions;
  status?: MemberStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrganizationMember extends BaseEntity {
  public organizationId: string;
  public userId: string;
  public role: MemberRole;
  public permissions: IMemberPermissions;
  public status: MemberStatus;
  public invitedBy?: string;
  public invitedAt?: Date;
  public joinedAt?: Date;
  public lastActiveAt?: Date;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: IOrganizationMemberProps) {
    super({ id: props.id ?? randomUUID() });
    this.organizationId = props.organizationId;
    this.userId = props.userId;
    this.role = props.role;
    this.permissions =
      props.permissions ?? this.getDefaultPermissions(props.role);
    this.status = props.status ?? 'pending';
    this.invitedBy = props.invitedBy;
    this.invitedAt = props.invitedAt;
    this.joinedAt = props.joinedAt;
    this.lastActiveAt = props.lastActiveAt;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  updateRole(role: MemberRole): void {
    this.role = role;
    this.permissions = this.getDefaultPermissions(role);
    this.updatedAt = new Date();
  }

  updatePermissions(permissions: Partial<IMemberPermissions>): void {
    this.permissions = { ...this.permissions, ...permissions };
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = 'active';
    this.joinedAt = new Date();
    this.updatedAt = new Date();
  }

  suspend(): void {
    this.status = 'suspended';
    this.updatedAt = new Date();
  }

  updateLastActive(): void {
    this.lastActiveAt = new Date();
  }

  hasPermission(permission: keyof IMemberPermissions): boolean {
    if (this.role === 'owner') return true;
    if (this.role === 'admin') return true;
    return this.permissions[permission] === true;
  }

  private getDefaultPermissions(role: MemberRole): IMemberPermissions {
    switch (role) {
      case 'owner':
        return {
          canManageOrders: true,
          canManageGuides: true,
          canManageMembers: true,
          canViewReports: true,
          canManageBilling: true,
          canManageSettings: true,
          canManageIntegrations: true,
        };
      case 'admin':
        return {
          canManageOrders: true,
          canManageGuides: true,
          canManageMembers: true,
          canViewReports: true,
          canManageBilling: false,
          canManageSettings: true,
          canManageIntegrations: true,
        };
      case 'member':
        return {
          canManageOrders: true,
          canManageGuides: true,
          canManageMembers: false,
          canViewReports: true,
          canManageBilling: false,
          canManageSettings: false,
          canManageIntegrations: false,
        };
      case 'viewer':
        return {
          canManageOrders: false,
          canManageGuides: false,
          canManageMembers: false,
          canViewReports: true,
          canManageBilling: false,
          canManageSettings: false,
          canManageIntegrations: false,
        };
    }
  }
}
