import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import { Organization } from '../../domain/entities/organization.entity';

@Injectable()
export class ListUserOrganizationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async execute(userId: string): Promise<Organization[]> {
    // Get all active memberships for user
    const memberships = await this.memberRepository.findActiveByUserId(userId);

    if (memberships.length === 0) {
      return [];
    }

    // Get organizations
    const organizations = await Promise.all(
      memberships.map((m) =>
        this.organizationRepository.findById(m.organizationId),
      ),
    );

    // Filter null and inactive organizations
    return organizations.filter(
      (org): org is Organization => org !== null && org.isActive,
    );
  }
}
