import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import {
  UpdateOrganizationDto,
  updateOrganizationSchema,
} from '../dto/update-organization.dto';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationNotFoundException } from '../../domain/exceptions/organization-not-found.exception';
import { NotOrganizationMemberException } from '../../domain/exceptions/not-organization-member.exception';
import { InsufficientPermissionsException } from '../../domain/exceptions/insufficient-permissions.exception';

@Injectable()
export class UpdateOrganizationUseCase {
  private readonly logger = new Logger(UpdateOrganizationUseCase.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async execute(
    organizationId: string,
    dto: UpdateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    const data = updateOrganizationSchema.parse(dto);

    // Verify membership and permissions
    const member = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      userId,
    );

    if (!member || member.status !== 'active') {
      throw new NotOrganizationMemberException();
    }

    if (!member.hasPermission('canManageSettings')) {
      throw new InsufficientPermissionsException('canManageSettings');
    }

    const organization =
      await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    // Update organization fields
    const updated = await this.organizationRepository.update(
      organizationId,
      data,
    );

    this.logger.log(`Organization ${organizationId} updated by user ${userId}`);
    return updated;
  }
}
