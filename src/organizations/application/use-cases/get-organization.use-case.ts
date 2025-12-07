import { Inject, Injectable } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationNotFoundException } from '../../domain/exceptions/organization-not-found.exception';
import { NotOrganizationMemberException } from '../../domain/exceptions/not-organization-member.exception';

@Injectable()
export class GetOrganizationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async execute(organizationId: string, userId: string): Promise<Organization> {
    // Verify membership
    const member = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      userId,
    );

    if (!member || member.status !== 'active') {
      throw new NotOrganizationMemberException();
    }

    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    return organization;
  }

  async executeBySlug(slug: string, userId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findBySlug(slug);

    if (!organization) {
      throw new OrganizationNotFoundException(slug);
    }

    // Verify membership
    const member = await this.memberRepository.findByOrganizationAndUser(
      organization.id,
      userId,
    );

    if (!member || member.status !== 'active') {
      throw new NotOrganizationMemberException();
    }

    return organization;
  }
}
