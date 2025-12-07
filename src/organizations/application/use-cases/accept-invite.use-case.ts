import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
  ORGANIZATION_INVITE_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import type { IOrganizationInviteRepository } from '../../domain/repositories/organization-invite.repository.interface';
import { OrganizationMember } from '../../domain/entities/organization-member.entity';
import { Organization } from '../../domain/entities/organization.entity';
import { InviteNotFoundException } from '../../domain/exceptions/invite-not-found.exception';
import { AlreadyMemberException } from '../../domain/exceptions/already-member.exception';

@Injectable()
export class AcceptInviteUseCase {
  private readonly logger = new Logger(AcceptInviteUseCase.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_INVITE_REPOSITORY)
    private readonly inviteRepository: IOrganizationInviteRepository,
  ) {}

  async execute(token: string, userId: string): Promise<Organization> {
    // Find invite by token
    const invite = await this.inviteRepository.findByToken(token);

    if (!invite) {
      throw new InviteNotFoundException();
    }

    if (!invite.isValid()) {
      if (invite.expiresAt < new Date()) {
        invite.expire();
        await this.inviteRepository.update(invite.id, { status: 'expired' });
      }
      throw new BadRequestException(
        'Invitation has expired or is no longer valid',
      );
    }

    // Check if already a member
    const existingMember =
      await this.memberRepository.findByOrganizationAndUser(
        invite.organizationId,
        userId,
      );

    if (existingMember) {
      throw new AlreadyMemberException();
    }

    // Create membership
    const member = new OrganizationMember({
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
      status: 'active',
      invitedBy: invite.invitedBy,
      invitedAt: invite.createdAt,
      joinedAt: new Date(),
    });

    await this.memberRepository.create(member);

    // Update invite status
    invite.accept(userId);
    await this.inviteRepository.update(invite.id, {
      status: 'accepted',
      acceptedAt: invite.acceptedAt,
      acceptedBy: invite.acceptedBy,
    });

    const organization = await this.organizationRepository.findById(
      invite.organizationId,
    );

    this.logger.log(
      `User ${userId} accepted invite and joined organization ${invite.organizationId}`,
    );

    return organization!;
  }
}
