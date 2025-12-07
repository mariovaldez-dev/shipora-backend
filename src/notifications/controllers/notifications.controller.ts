import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/infrastructure/decorators/current-user.decorator';
import { NotificationsService } from '../services/notifications.service';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
  QueryNotificationsDto,
  MarkNotificationsReadDto,
} from '../dto/notification.dto';
import { Notification } from '../entities/notification.entity';

interface JwtPayload {
  userId: string;
  organizationId: string;
  email: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==================== Create ====================

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNotificationDto,
  ): Promise<Notification> {
    return this.notificationsService.create(user.organizationId, dto);
  }

  @Post('bulk')
  async createBulk(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkCreateNotificationDto,
  ): Promise<{ created: number }> {
    return this.notificationsService.createBulk(user.organizationId, dto);
  }

  // ==================== Read ====================

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryNotificationsDto,
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.notificationsService.findAll(
      user.organizationId,
      user.userId,
      query,
    );
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(
      user.organizationId,
      user.userId,
    );
    return { count };
  }

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getStats(user.organizationId, user.userId);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notificationsService.findById(
      user.organizationId,
      user.userId,
      id,
    );
  }

  // ==================== Update ====================

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(
      user.organizationId,
      user.userId,
      id,
    );
  }

  @Post('mark-read')
  async markManyAsRead(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkNotificationsReadDto,
  ): Promise<{ updated: number }> {
    return this.notificationsService.markManyAsRead(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ updated: number }> {
    return this.notificationsService.markAllAsRead(
      user.organizationId,
      user.userId,
    );
  }

  @Patch(':id/archive')
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<Notification> {
    return this.notificationsService.archive(
      user.organizationId,
      user.userId,
      id,
    );
  }

  // ==================== Delete ====================

  @Delete(':id')
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.delete(
      user.organizationId,
      user.userId,
      id,
    );
    return { success: true };
  }

  @Delete('archived/all')
  async deleteAllArchived(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ deleted: number }> {
    return this.notificationsService.deleteAllArchived(
      user.organizationId,
      user.userId,
    );
  }
}
