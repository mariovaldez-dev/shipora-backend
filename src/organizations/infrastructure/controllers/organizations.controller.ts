import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { GetOrganizationUseCase } from '../../application/use-cases/get-organization.use-case';
import { ListUserOrganizationsUseCase } from '../../application/use-cases/list-user-organizations.use-case';
import { UpdateOrganizationUseCase } from '../../application/use-cases/update-organization.use-case';
import { DeleteOrganizationUseCase } from '../../application/use-cases/delete-organization.use-case';
import { GetMembersUseCase } from '../../application/use-cases/get-members.use-case';
import { InviteMemberUseCase } from '../../application/use-cases/invite-member.use-case';
import { AcceptInviteUseCase } from '../../application/use-cases/accept-invite.use-case';
import type { CreateOrganizationDto } from '../../application/dto/create-organization.dto';
import type { UpdateOrganizationDto } from '../../application/dto/update-organization.dto';
import type {
  InviteMemberDto,
  AcceptInviteDto,
} from '../../application/dto/member.dto';

interface AuthenticatedRequest {
  user: { userId: string };
}

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly listUserOrganizationsUseCase: ListUserOrganizationsUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
    private readonly getMembersUseCase: GetMembersUseCase,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
  ) {}

  // ============ ORGANIZATION ENDPOINTS ============

  @Post()
  async create(
    @Body() dto: CreateOrganizationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const organization = await this.createOrganizationUseCase.execute(
      dto,
      req.user.userId,
    );
    return { success: true, data: organization };
  }

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const organizations = await this.listUserOrganizationsUseCase.execute(
      req.user.userId,
    );
    return { success: true, data: organizations };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const organization = await this.getOrganizationUseCase.execute(
      id,
      req.user.userId,
    );
    return { success: true, data: organization };
  }

  @Get('slug/:slug')
  async findBySlug(
    @Param('slug') slug: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const organization = await this.getOrganizationUseCase.executeBySlug(
      slug,
      req.user.userId,
    );
    return { success: true, data: organization };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const organization = await this.updateOrganizationUseCase.execute(
      id,
      dto,
      req.user.userId,
    );
    return { success: true, data: organization };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.deleteOrganizationUseCase.execute(id, req.user.userId);
  }

  // ============ MEMBER ENDPOINTS ============

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const members = await this.getMembersUseCase.execute(id, req.user.userId);
    return { success: true, data: members };
  }

  @Post(':id/members/invite')
  async inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const invite = await this.inviteMemberUseCase.execute(
      id,
      dto,
      req.user.userId,
    );
    return { success: true, data: invite };
  }

  @Post('invites/accept')
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const organization = await this.acceptInviteUseCase.execute(
      dto.token,
      req.user.userId,
    );
    return { success: true, data: organization };
  }
}
