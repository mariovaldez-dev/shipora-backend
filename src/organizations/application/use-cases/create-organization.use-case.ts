import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IOrganizationRepository } from '../../domain/repositories/organization.repository.interface';
import type { IOrganizationMemberRepository } from '../../domain/repositories/organization-member.repository.interface';
import {
  CreateOrganizationDto,
  createOrganizationSchema,
} from '../dto/create-organization.dto';
import { Organization } from '../../domain/entities/organization.entity';
import { OrganizationMember } from '../../domain/entities/organization-member.entity';
import { OrganizationSlugExistsException } from '../../domain/exceptions/organization-slug-exists.exception';

@Injectable()
export class CreateOrganizationUseCase {
  private readonly logger = new Logger(CreateOrganizationUseCase.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(ORGANIZATION_MEMBER_REPOSITORY)
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async execute(
    dto: CreateOrganizationDto,
    userId: string,
  ): Promise<Organization> {
    const data = createOrganizationSchema.parse(dto);

    // Generate slug if not provided
    const slug = data.slug || Organization.generateSlug(data.name);

    // Check if slug exists
    const slugExists = await this.organizationRepository.slugExists(slug);
    if (slugExists) {
      this.logger.warn(`Organization with slug ${slug} already exists`);
      throw new OrganizationSlugExistsException(slug);
    }

    // Create organization
    const organization = new Organization({
      name: data.name,
      slug,
      description: data.description,
      website: data.website,
      ownerId: userId,
      allowedDomains: data.allowedDomains,
    });

    const createdOrg = await this.organizationRepository.create(organization);

    // Add creator as owner member
    const member = new OrganizationMember({
      organizationId: createdOrg.id,
      userId,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });

    await this.memberRepository.create(member);

    this.logger.log(`Organization ${createdOrg.id} created by user ${userId}`);
    return createdOrg;
  }
}
