import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import {
  CreateGuideDto,
  UpdateGuideStatusDto,
  UpdateGuidePriorityDto,
  BatchGuideOperationDto,
  BatchUpdateStatusDto,
  AddTrackingEventDto,
  UpdateWarehouseNotesDto,
  GuideFilterDto,
} from '../../application/dto';
import { CreateGuideUseCase } from '../../application/use-cases/create-guide.use-case';
import { ListGuidesUseCase } from '../../application/use-cases/list-guides.use-case';
import { GetGuideUseCase } from '../../application/use-cases/get-guide.use-case';
import { UpdateGuideUseCase } from '../../application/use-cases/update-guide.use-case';
import { BatchOperationsUseCase } from '../../application/use-cases/batch-operations.use-case';
import { GetGuideSummaryUseCase } from '../../application/use-cases/get-guide-summary.use-case';

@Controller('guides')
@UseGuards(JwtAuthGuard)
export class GuidesController {
  constructor(
    private readonly createGuideUseCase: CreateGuideUseCase,
    private readonly listGuidesUseCase: ListGuidesUseCase,
    private readonly getGuideUseCase: GetGuideUseCase,
    private readonly updateGuideUseCase: UpdateGuideUseCase,
    private readonly batchOperationsUseCase: BatchOperationsUseCase,
    private readonly getGuideSummaryUseCase: GetGuideSummaryUseCase,
  ) {}

  /**
   * Create a new guide
   * POST /guides
   */
  @Post()
  async createGuide(@Body() dto: CreateGuideDto, @Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const guide = await this.createGuideUseCase.execute({
      ...dto,
      userId,
    });

    return {
      success: true,
      data: guide,
      message: 'Guide created successfully',
    };
  }

  /**
   * List guides with optional filters
   * GET /guides?status=PENDING&limit=50&skip=0
   */
  @Get()
  async listGuides(@Request() req: any, @Query() query: GuideFilterDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const filters = {
      status: query.status,
      carrierId: query.carrierId,
      orderId: query.orderId,
      isPrinted: query.isPrinted,
      isShipped: query.isShipped,
      priority: query.priority,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      search: query.search,
    };

    const pagination = {
      limit: Math.min(query.limit || 50, 100),
      skip: query.skip || 0,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    };

    const result = await this.listGuidesUseCase.execute(userId, filters, pagination);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get guide summary/statistics
   * GET /guides/summary?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('summary')
  async getGuideSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const summary = await this.getGuideSummaryUseCase.execute(userId, start, end);

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Get guide by ID
   * GET /guides/:id
   */
  @Get(':id')
  async getGuide(@Param('id') id: string) {
    const guide = await this.getGuideUseCase.execute(id);
    return {
      success: true,
      data: guide,
    };
  }

  /**
   * Get guide by tracking number
   * GET /guides/track/:trackingNumber
   */
  @Get('track/:trackingNumber')
  async getGuideByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    const guide = await this.getGuideUseCase.byTrackingNumber(trackingNumber);
    return {
      success: true,
      data: guide,
    };
  }

  /**
   * Update guide status
   * PATCH /guides/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateGuideStatusDto,
  ) {
    const guide = await this.updateGuideUseCase.updateStatus(id, dto.status, dto.reason);
    return {
      success: true,
      data: guide,
      message: `Guide status updated to ${dto.status}`,
    };
  }

  /**
   * Update guide priority
   * PATCH /guides/:id/priority
   */
  @Patch(':id/priority')
  async updatePriority(
    @Param('id') id: string,
    @Body() dto: UpdateGuidePriorityDto,
  ) {
    const guide = await this.updateGuideUseCase.updatePriority(id, dto.priority);
    return {
      success: true,
      data: guide,
      message: `Guide priority updated to ${dto.priority}`,
    };
  }

  /**
   * Mark guide as printed (warehouse operation)
   * POST /guides/:id/print
   */
  @Post(':id/print')
  async markAsPrinted(@Param('id') id: string, @Request() req: any) {
    const printedBy = req.user?.email || req.user?.userId || 'unknown';
    const guide = await this.updateGuideUseCase.markAsPrinted(id, printedBy);
    return {
      success: true,
      data: guide,
      message: 'Guide marked as printed',
    };
  }

  /**
   * Mark guide as shipped (warehouse operation)
   * POST /guides/:id/ship
   */
  @Post(':id/ship')
  async markAsShipped(@Param('id') id: string, @Request() req: any) {
    const shippedBy = req.user?.email || req.user?.userId || 'unknown';
    const guide = await this.updateGuideUseCase.markAsShipped(id, shippedBy);
    return {
      success: true,
      data: guide,
      message: 'Guide marked as shipped',
    };
  }

  /**
   * Add tracking event to guide
   * POST /guides/:id/tracking
   */
  @Post(':id/tracking')
  async addTrackingEvent(
    @Param('id') id: string,
    @Body() dto: AddTrackingEventDto,
  ) {
    const guide = await this.updateGuideUseCase.addTrackingEvent(id, dto);
    return {
      success: true,
      data: guide,
      message: 'Tracking event added',
    };
  }

  /**
   * Update warehouse notes
   * PATCH /guides/:id/notes
   */
  @Patch(':id/notes')
  async updateWarehouseNotes(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseNotesDto,
  ) {
    const guide = await this.updateGuideUseCase.updateWarehouseNotes(id, dto.notes);
    return {
      success: true,
      data: guide,
      message: 'Warehouse notes updated',
    };
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Batch update status
   * POST /guides/batch/status
   */
  @Post('batch/status')
  async batchUpdateStatus(@Body() dto: BatchUpdateStatusDto) {
    const result = await this.batchOperationsUseCase.batchUpdateStatus(
      dto.guideIds,
      dto.status,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Batch mark as printed
   * POST /guides/batch/print
   */
  @Post('batch/print')
  async batchMarkAsPrinted(@Body() dto: BatchGuideOperationDto, @Request() req: any) {
    const printedBy = req.user?.email || req.user?.userId || 'unknown';
    const result = await this.batchOperationsUseCase.batchMarkAsPrinted(
      dto.guideIds,
      printedBy,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Batch mark as shipped
   * POST /guides/batch/ship
   */
  @Post('batch/ship')
  async batchMarkAsShipped(@Body() dto: BatchGuideOperationDto, @Request() req: any) {
    const shippedBy = req.user?.email || req.user?.userId || 'unknown';
    const result = await this.batchOperationsUseCase.batchMarkAsShipped(
      dto.guideIds,
      shippedBy,
    );
    return {
      success: true,
      data: result,
    };
  }
}
