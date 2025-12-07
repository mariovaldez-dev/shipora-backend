import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/infrastructure/decorators/current-user.decorator';
import { TrackingService } from '../services/tracking.service';
import {
  CreateTrackingDto,
  AddTrackingEventDto,
  QueryTrackingDto,
  WebhookEventDto,
  UpdateNotificationSettingsDto,
} from '../dto/tracking.dto';

interface RequestUser {
  userId: string;
  organizationId: string;
}

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  // ==================== Public Endpoints (No Auth) ====================

  /**
   * Public tracking lookup
   * GET /tracking/public/:trackingNumber
   */
  @Get('public/:trackingNumber')
  async getPublicTracking(@Param('trackingNumber') trackingNumber: string) {
    const tracking =
      await this.trackingService.getPublicTracking(trackingNumber);
    return {
      success: true,
      data: tracking,
    };
  }

  /**
   * Webhook endpoint for carrier updates
   * POST /tracking/webhook/:carrier
   */
  @Post('webhook/:carrier')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('carrier') carrier: string,
    @Body() body: Record<string, unknown>,
  ) {
    // Transform carrier-specific payload to standard format
    const dto: WebhookEventDto = {
      carrier,
      carrierTrackingNumber:
        (body.trackingNumber as string) || (body.guia as string) || '',
      status: (body.status as string) || (body.estado as string) || '',
      description: (body.description as string) || (body.descripcion as string),
      timestamp: (body.timestamp as string) || (body.fecha as string),
      location: body.location as WebhookEventDto['location'],
      signedBy: (body.signedBy as string) || (body.recibio as string),
      proofOfDelivery:
        (body.proofOfDelivery as string) || (body.evidencia as string),
      rawPayload: body,
    };

    const tracking = await this.trackingService.handleWebhook(dto);

    return {
      success: true,
      message: tracking
        ? 'Tracking updated successfully'
        : 'Tracking not found',
      trackingNumber: tracking?.trackingNumber,
    };
  }

  // ==================== Protected Endpoints ====================

  /**
   * Create a new tracking
   * POST /tracking
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTrackingDto,
  ) {
    const tracking = await this.trackingService.create(
      user.organizationId,
      dto,
    );
    return {
      success: true,
      data: tracking,
      message: 'Tracking created successfully',
    };
  }

  /**
   * List all trackings
   * GET /tracking?status=in_transit&carrier=fedex&page=1&limit=20
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query() query: QueryTrackingDto,
  ) {
    const result = await this.trackingService.findAll(
      user.organizationId,
      query,
    );
    return {
      success: true,
      data: result.trackings,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get tracking by tracking number
   * GET /tracking/:trackingNumber
   */
  @Get(':trackingNumber')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('trackingNumber') trackingNumber: string,
  ) {
    const tracking = await this.trackingService.findByTrackingNumber(
      user.organizationId,
      trackingNumber,
    );
    return {
      success: true,
      data: tracking,
    };
  }

  /**
   * Add tracking event
   * POST /tracking/:trackingNumber/events
   */
  @Post(':trackingNumber/events')
  @UseGuards(JwtAuthGuard)
  async addEvent(
    @CurrentUser() user: RequestUser,
    @Param('trackingNumber') trackingNumber: string,
    @Body() dto: AddTrackingEventDto,
  ) {
    const tracking = await this.trackingService.addEvent(
      user.organizationId,
      trackingNumber,
      dto,
    );
    return {
      success: true,
      data: tracking,
      message: 'Event added successfully',
    };
  }

  /**
   * Update notification settings
   * PATCH /tracking/:trackingNumber/notifications
   */
  @Patch(':trackingNumber/notifications')
  @UseGuards(JwtAuthGuard)
  async updateNotifications(
    @CurrentUser() user: RequestUser,
    @Param('trackingNumber') trackingNumber: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    const tracking = await this.trackingService.updateNotificationSettings(
      user.organizationId,
      trackingNumber,
      dto,
    );
    return {
      success: true,
      data: tracking,
      message: 'Notification settings updated',
    };
  }

  /**
   * Get tracking statistics
   * GET /tracking/stats/summary
   */
  @Get('stats/summary')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser() user: RequestUser) {
    const stats = await this.trackingService.getStats(user.organizationId);
    return {
      success: true,
      data: stats,
    };
  }
}
