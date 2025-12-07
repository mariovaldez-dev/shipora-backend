import { BaseEntity } from '@shared/domain/base.entity';
import { randomBytes, randomUUID } from 'crypto';
import type { MemberRole } from './organization-member.entity';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface IOrganizationInviteProps {
  id?: string;
  organizationId: string;
  email: string;
  role: Exclude<MemberRole, 'owner'>;
  token?: string;
  invitedBy: string;
  status?: InviteStatus;
  expiresAt?: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OrganizationInvite extends BaseEntity {
  public organizationId: string;
  public email: string;
  public role: Exclude<MemberRole, 'owner'>;
  public token: string;
  public invitedBy: string;
  public status: InviteStatus;
  public expiresAt: Date;
  public acceptedAt?: Date;
  public acceptedBy?: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: IOrganizationInviteProps) {
    super({ id: props.id ?? randomUUID() });
    this.organizationId = props.organizationId;
    this.email = props.email.toLowerCase();
    this.role = props.role;
    this.token = props.token ?? randomBytes(32).toString('hex');
    this.invitedBy = props.invitedBy;
    this.status = props.status ?? 'pending';
    this.expiresAt = props.expiresAt ?? this.generateExpiryDate();
    this.acceptedAt = props.acceptedAt;
    this.acceptedBy = props.acceptedBy;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  accept(userId: string): void {
    this.status = 'accepted';
    this.acceptedAt = new Date();
    this.acceptedBy = userId;
    this.updatedAt = new Date();
  }

  cancel(): void {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  expire(): void {
    this.status = 'expired';
    this.updatedAt = new Date();
  }

  isValid(): boolean {
    return this.status === 'pending' && this.expiresAt > new Date();
  }

  private generateExpiryDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 days expiry
    return date;
  }
}
