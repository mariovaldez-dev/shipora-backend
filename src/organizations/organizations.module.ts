import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import { OrganizationSchema } from './infrastructure/persistence/schemas/organization.schema';
import { OrganizationMemberSchema } from './infrastructure/persistence/schemas/organization-member.schema';
import { OrganizationInviteSchema } from './infrastructure/persistence/schemas/organization-invite.schema';

// Repositories
import { OrganizationRepository } from './infrastructure/persistence/repositories/organization.repository';
import { OrganizationMemberRepository } from './infrastructure/persistence/repositories/organization-member.repository';
import { OrganizationInviteRepository } from './infrastructure/persistence/repositories/organization-invite.repository';

// Use Cases
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetOrganizationUseCase } from './application/use-cases/get-organization.use-case';
import { ListUserOrganizationsUseCase } from './application/use-cases/list-user-organizations.use-case';
import { UpdateOrganizationUseCase } from './application/use-cases/update-organization.use-case';
import { DeleteOrganizationUseCase } from './application/use-cases/delete-organization.use-case';
import { GetMembersUseCase } from './application/use-cases/get-members.use-case';
import { InviteMemberUseCase } from './application/use-cases/invite-member.use-case';
import { AcceptInviteUseCase } from './application/use-cases/accept-invite.use-case';

// Controller
import { OrganizationsController } from './infrastructure/controllers/organizations.controller';

// Constants
import {
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_MEMBER_REPOSITORY,
  ORGANIZATION_INVITE_REPOSITORY,
} from './domain/repositories/constants';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'OrganizationMember', schema: OrganizationMemberSchema },
      { name: 'OrganizationInvite', schema: OrganizationInviteSchema },
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [
    // Repositories
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository,
    },
    {
      provide: ORGANIZATION_MEMBER_REPOSITORY,
      useClass: OrganizationMemberRepository,
    },
    {
      provide: ORGANIZATION_INVITE_REPOSITORY,
      useClass: OrganizationInviteRepository,
    },
    // Use Cases
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    ListUserOrganizationsUseCase,
    UpdateOrganizationUseCase,
    DeleteOrganizationUseCase,
    GetMembersUseCase,
    InviteMemberUseCase,
    AcceptInviteUseCase,
  ],
  exports: [
    ORGANIZATION_REPOSITORY,
    ORGANIZATION_MEMBER_REPOSITORY,
    ORGANIZATION_INVITE_REPOSITORY,
  ],
})
export class OrganizationsModule {}
