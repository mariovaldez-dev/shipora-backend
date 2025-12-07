import { BaseEntity } from '@shared/domain/base.entity';
import { randomUUID } from 'crypto';

export type OrganizationPlan =
  | 'free'
  | 'starter'
  | 'professional'
  | 'enterprise';

export interface IOrganizationSettings {
  defaultCarrier?: string;
  autoApproveOrders?: boolean;
  notificationsEnabled?: boolean;
  webhookUrl?: string;
  defaultPackaging?: string;
  insuranceDefault?: boolean;
}

export interface IOrganizationBilling {
  plan: OrganizationPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingEmail?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface IOrganizationProps {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  ownerId: string;
  settings?: IOrganizationSettings;
  billing?: IOrganizationBilling;
  isActive?: boolean;
  allowedDomains?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Organization extends BaseEntity {
  public name: string;
  public slug: string;
  public description?: string;
  public logo?: string;
  public website?: string;
  public ownerId: string;
  public settings: IOrganizationSettings;
  public billing: IOrganizationBilling;
  public isActive: boolean;
  public allowedDomains: string[];
  public metadata: Record<string, unknown>;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(props: IOrganizationProps) {
    super({ id: props.id ?? randomUUID() });
    this.name = props.name;
    this.slug = props.slug;
    this.description = props.description;
    this.logo = props.logo;
    this.website = props.website;
    this.ownerId = props.ownerId;
    this.settings = props.settings ?? {};
    this.billing = props.billing ?? { plan: 'free' };
    this.isActive = props.isActive ?? true;
    this.allowedDomains = props.allowedDomains ?? [];
    this.metadata = props.metadata ?? {};
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  updateSettings(settings: Partial<IOrganizationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.updatedAt = new Date();
  }

  updateBilling(billing: Partial<IOrganizationBilling>): void {
    this.billing = { ...this.billing, ...billing };
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  transferOwnership(newOwnerId: string): void {
    this.ownerId = newOwnerId;
    this.updatedAt = new Date();
  }

  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
