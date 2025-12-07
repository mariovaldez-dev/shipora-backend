import { Inject, Injectable } from '@nestjs/common';
import { ORGANIZATION_MEMBER_REPOSITORY } from '../../domain/repositories/constants';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import { OrganizationMember } from '../../domain/entities/organization-member.entity';
import { NotOrganizationMemberException } from '../../domain/exceptions/not-organization-member.exception';

@Injectable()
export class GetMembersUseCase {
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember[]> {
    // Verify user is a member
    const userMember = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      userId,
    );

    if (!userMember || userMember.status !== 'active') {
      throw new NotOrganizationMemberException();
    }

    return this.memberRepository.findByOrganizationId(organizationId);
  }
}
