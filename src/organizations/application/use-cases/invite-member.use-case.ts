import { Inject, Injectable, Logger, ConflictException } from '@nestjs/common';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  ORGANIZATION_INVITE_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import type { IOrganizationInviteRepository } from '../../domain/repositories/organization-invite.repository.interface';
import { OrganizationInvite } from '../../domain/entities/organization-invite.entity';
import { InviteMemberDto, inviteMemberSchema } from '../dto/member.dto';
import { NotOrganizationMemberException } from '../../domain/exceptions/not-organization-member.exception';
import { InsufficientPermissionsException } from '../../domain/exceptions/insufficient-permissions.exception';

@Injectable()
export class InviteMemberUseCase {
  private readonly logger = new Logger(InviteMemberUseCase.name);

  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
    @Inject(ORGANIZATION_INVITE_REPOSITORY)
    private readonly inviteRepository: IOrganizationInviteRepository,
  ) {}

  async execute(
    organizationId: string,
    dto: InviteMemberDto,
    inviterId: string,
  ): Promise<OrganizationInvite> {
    const data = inviteMemberSchema.parse(dto);

    // Verify inviter is a member with permissions
    const inviter = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      inviterId,
    );

    if (!inviter || inviter.status !== 'active') {
      throw new NotOrganizationMemberException();
    }

    if (!inviter.hasPermission('canManageMembers')) {
      throw new InsufficientPermissionsException('canManageMembers');
    }

    // Check for existing pending invite
    const existingInvite = await this.inviteRepository.findPendingByEmail(
      organizationId,
      data.email,
    );

    if (existingInvite) {
      throw new ConflictException(
        'An invitation has already been sent to this email',
      );
    }

    // Create invite
    const invite = new OrganizationInvite({
      organizationId,
      email: data.email,
      role: data.role,
      invitedBy: inviterId,
    });

    const createdInvite = await this.inviteRepository.create(invite);

    // TODO: Send invitation email
    // await this.emailService.sendInvitation(createdInvite);

    this.logger.log(
      `Invitation sent to ${data.email} for organization ${organizationId}`,
    );
    return createdInvite;
  }
}
