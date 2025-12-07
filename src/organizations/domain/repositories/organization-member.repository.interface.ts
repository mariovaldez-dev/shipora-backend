import { IRepository } from '@shared/domain/repository.interface';
import { OrganizationMember } from '../entities/organization-member.entity';

export interface IOrganizationMemberRepository
  extends IRepository<OrganizationMember> {
  findByOrganizationId(organizationId: string): Promise<OrganizationMember[]>;
  findByUserId(userId: string): Promise<OrganizationMember[]>;
  findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null>;
  findActiveByUserId(userId: string): Promise<OrganizationMember[]>;
}
