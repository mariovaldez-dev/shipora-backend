import { IRepository } from '@shared/domain/repository.interface';
import { OrganizationInvite } from '../entities/organization-invite.entity';

export interface IOrganizationInviteRepository
  extends IRepository<OrganizationInvite> {
  findByToken(token: string): Promise<OrganizationInvite | null>;
  findByOrganizationId(organizationId: string): Promise<OrganizationInvite[]>;
  findPendingByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationInvite[]>;
  findPendingByEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInvite | null>;
}
