import { Inject, Injectable, Logger, ForbiddenException } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
  ORGANIZATION_INVITE_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import type { IOrganizationInviteRepository } from '../../domain/repositories/organization-invite.repository.interface';
import { OrganizationNotFoundException } from '../../domain/exceptions/organization-not-found.exception';

@Injectable()
export class DeleteOrganizationUseCase {
  private readonly logger = new Logger(DeleteOrganizationUseCase.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_INVITE_REPOSITORY)
    private readonly inviteRepository: IOrganizationInviteRepository,
  ) {}

  async execute(organizationId: string, userId: string): Promise<void> {
    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    // Only owner can delete
    if (organization.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the owner can delete the organization',
      );
    }

    // Delete all related data
    const members =
      await this.memberRepository.findByOrganizationId(organizationId);
    for (const member of members) {
      await this.memberRepository.delete(member.id);
    }

    const invites =
      await this.inviteRepository.findByOrganizationId(organizationId);
    for (const invite of invites) {
      await this.inviteRepository.delete(invite.id);
    }

    await this.organizationRepository.delete(organizationId);

    this.logger.log(
      `Organization ${organizationId} deleted by owner ${userId}`,
    );
  }
}
