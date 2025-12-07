import { BaseEntity } from '@shared/domain/base.entity';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { randomUUID } from 'crypto';

export type Role =
  | 'user'
  | 'premium'
  | 'tenant_user'
  | 'tenant_admin'
  | 'admin';

export interface IUserProps {
  id?: string;
  email: Email;
  password: Password;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActive?: boolean;
  tenantId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends BaseEntity {
  private events: any[] = [];

  public readonly email: Email;
  public readonly password: Password;
  public firstName: string;
  public lastName: string;
  public roles: Role[];
  public isActive: boolean;
  public tenantId: string | null;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: IUserProps) {
    super({ id: props.id ?? randomUUID() });
    this.email = props.email;
    this.password = props.password;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.roles = props.roles;
    this.isActive = props.isActive ?? true;
    this.tenantId = props.tenantId ?? null;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  public addEvent(event: any) {
    this.events.push(event);
  }

  public pullEvents(): any[] {
    const evts = [...this.events];
    this.events = [];
    return evts;
  }

  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public assignRole(role: Role) {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      this.updatedAt = new Date();
    }
  }

  public removeRole(role: Role) {
    if (this.roles.includes(role)) {
      this.roles = this.roles.filter((r) => r !== role);
      this.updatedAt = new Date();
    }
  }

  // ====== Serialización para persistencia / API ======
  public toPrimitives() {
    return {
      id: this.id,
      email: this.email.getValue(),
      password: this.password.value, // hashed
      firstName: this.firstName,
      lastName: this.lastName,
      roles: this.roles,
      isActive: this.isActive,
      tenantId: this.tenantId,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }

  // ====== Construir entidad desde datos planos (DB / JSON) ======
  public static fromPrimitives(raw: any): User {
    const email = new Email(raw.email);
    // Password.fromHash convertirá el hash en VO sin rehashear
    const password = Password.fromHash(raw.password);
    return new User({
      id: raw._id?.toString?.() ?? raw.id,
      email,
      password,
      firstName: raw.firstName,
      lastName: raw.lastName,
      roles: raw.roles ?? ['user'],
      isActive: typeof raw.isActive === 'boolean' ? raw.isActive : true,
      tenantId: raw.tenantId ?? null,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    });
  }
}
