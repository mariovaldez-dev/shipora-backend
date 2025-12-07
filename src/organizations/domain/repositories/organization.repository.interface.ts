import { IRepository } from '@shared/domain/repository.interface';
import { Organization } from '../entities/organization.entity';

export interface IOrganizationRepository extends IRepository<Organization> {
  findBySlug(slug: string): Promise<Organization | null>;
  findByOwnerId(ownerId: string): Promise<Organization[]>;
  slugExists(slug: string): Promise<boolean>;
}
