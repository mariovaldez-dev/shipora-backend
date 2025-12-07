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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@shared/infrastructure/decorators/current-user.decorator';
import { CoverageService } from '../services/coverage.service';
import {
  CreateCoverageZoneDto,
  UpdateCoverageZoneDto,
  QueryCoverageZonesDto,
  CheckCoverageDto,
  CalculateRateDto,
  PostalCodesDto,
  BulkStatusUpdateDto,
  CreateCoverageServiceDto,
} from '../dto/coverage.dto';
// Interface for the authenticated user
interface RequestUser {
  userId: string;
  organizationId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('coverage')
export class CoverageController {
  constructor(private readonly coverageService: CoverageService) {}

  // ==================== Zone CRUD ====================

  /**
   * Create a new coverage zone
   * POST /coverage/zones
   */
  @Post('zones')
  async createZone(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCoverageZoneDto,
  ) {
    const zone = await this.coverageService.create(user.organizationId, dto);
    return {
      success: true,
      data: zone,
      message: 'Coverage zone created successfully',
    };
  }

  /**
   * List all coverage zones
   * GET /coverage/zones?status=active&type=postal_codes&search=norte&page=1&limit=20
   */
  @Get('zones')
  async listZones(
    @CurrentUser() user: RequestUser,
    @Query() query: QueryCoverageZonesDto,
  ) {
    const result = await this.coverageService.findAll(
      user.organizationId,
      query,
    );
    return {
      success: true,
      data: result.zones,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get a coverage zone by ID
   * GET /coverage/zones/:id
   */
  @Get('zones/:id')
  async getZone(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const zone = await this.coverageService.findById(user.organizationId, id);
    return {
      success: true,
      data: zone,
    };
  }

  /**
   * Get a coverage zone by code
   * GET /coverage/zones/code/:code
   */
  @Get('zones/code/:code')
  async getZoneByCode(
    @CurrentUser() user: RequestUser,
    @Param('code') code: string,
  ) {
    const zone = await this.coverageService.findByCode(
      user.organizationId,
      code,
    );
    return {
      success: true,
      data: zone,
    };
  }

  /**
   * Update a coverage zone
   * PATCH /coverage/zones/:id
   */
  @Patch('zones/:id')
  async updateZone(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCoverageZoneDto,
  ) {
    const zone = await this.coverageService.update(
      user.organizationId,
      id,
      dto,
    );
    return {
      success: true,
      data: zone,
      message: 'Coverage zone updated successfully',
    };
  }

  /**
   * Delete a coverage zone
   * DELETE /coverage/zones/:id
   */
  @Delete('zones/:id')
  @HttpCode(HttpStatus.OK)
  async deleteZone(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.coverageService.delete(user.organizationId, id);
    return {
      success: true,
      message: 'Coverage zone deleted successfully',
    };
  }

  // ==================== Coverage Check ====================

  /**
   * Check coverage for a location
   * POST /coverage/check
   */
  @Post('check')
  async checkCoverage(
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckCoverageDto,
  ) {
    const result = await this.coverageService.checkCoverage(
      user.organizationId,
      dto,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Check coverage for a postal code (quick check)
   * GET /coverage/check/postal/:postalCode
   */
  @Get('check/postal/:postalCode')
  async checkPostalCode(
    @CurrentUser() user: RequestUser,
    @Param('postalCode') postalCode: string,
  ) {
    const result = await this.coverageService.checkPostalCode(
      user.organizationId,
      postalCode,
    );
    return {
      success: true,
      data: result,
    };
  }

  // ==================== Rate Calculation ====================

  /**
   * Calculate shipping rates for a shipment
   * POST /coverage/rates/calculate
   */
  @Post('rates/calculate')
  async calculateRates(
    @CurrentUser() user: RequestUser,
    @Body() dto: CalculateRateDto,
  ) {
    const rates = await this.coverageService.calculateRate(
      user.organizationId,
      dto,
    );
    return {
      success: true,
      data: rates,
      meta: {
        count: rates.length,
      },
    };
  }

  // ==================== Postal Codes Management ====================

  /**
   * Add postal codes to a zone
   * POST /coverage/zones/:id/postal-codes
   */
  @Post('zones/:id/postal-codes')
  async addPostalCodes(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PostalCodesDto,
  ) {
    const zone = await this.coverageService.addPostalCodes(
      user.organizationId,
      id,
      dto,
    );
    return {
      success: true,
      data: zone,
      message: `${dto.postalCodes.length} postal codes processed`,
    };
  }

  /**
   * Remove postal codes from a zone (DELETE method)
   * DELETE /coverage/zones/:id/postal-codes
   */
  @Delete('zones/:id/postal-codes')
  @HttpCode(HttpStatus.OK)
  async removePostalCodes(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PostalCodesDto,
  ) {
    const zone = await this.coverageService.removePostalCodes(
      user.organizationId,
      id,
      dto,
    );
    return {
      success: true,
      data: zone,
      message: `${dto.postalCodes.length} postal codes removed`,
    };
  }

  /**
   * Remove postal codes from a zone (POST method for clients that don't support DELETE with body)
   * POST /coverage/zones/:id/postal-codes/remove
   */
  @Post('zones/:id/postal-codes/remove')
  async removePostalCodesPost(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: PostalCodesDto,
  ) {
    const zone = await this.coverageService.removePostalCodes(
      user.organizationId,
      id,
      dto,
    );
    return {
      success: true,
      data: zone,
      message: `${dto.postalCodes.length} postal codes removed`,
    };
  }

  // ==================== Service Management ====================

  /**
   * Add a service to a zone
   * POST /coverage/zones/:zoneId/services
   */
  @Post('zones/:zoneId/services')
  async addService(
    @CurrentUser() user: RequestUser,
    @Param('zoneId') zoneId: string,
    @Body() dto: CreateCoverageServiceDto,
  ) {
    const zone = await this.coverageService.addService(
      user.organizationId,
      zoneId,
      dto,
    );
    return {
      success: true,
      data: zone,
      message: 'Service added successfully',
    };
  }

  /**
   * Update a service in a zone
   * PATCH /coverage/zones/:zoneId/services/:serviceId
   */
  @Patch('zones/:zoneId/services/:serviceId')
  async updateService(
    @CurrentUser() user: RequestUser,
    @Param('zoneId') zoneId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: Partial<CreateCoverageServiceDto>,
  ) {
    const zone = await this.coverageService.updateService(
      user.organizationId,
      zoneId,
      serviceId,
      dto as never,
    );
    return {
      success: true,
      data: zone,
      message: 'Service updated successfully',
    };
  }

  /**
   * Remove a service from a zone
   * DELETE /coverage/zones/:zoneId/services/:serviceId
   */
  @Delete('zones/:zoneId/services/:serviceId')
  @HttpCode(HttpStatus.OK)
  async removeService(
    @CurrentUser() user: RequestUser,
    @Param('zoneId') zoneId: string,
    @Param('serviceId') serviceId: string,
  ) {
    const zone = await this.coverageService.removeService(
      user.organizationId,
      zoneId,
      serviceId,
    );
    return {
      success: true,
      data: zone,
      message: 'Service removed successfully',
    };
  }

  // ==================== Statistics ====================

  /**
   * Get coverage statistics
   * GET /coverage/stats
   */
  @Get('stats')
  async getStats(@CurrentUser() user: RequestUser) {
    const stats = await this.coverageService.getStats(user.organizationId);
    return {
      success: true,
      data: stats,
    };
  }

  // ==================== Bulk Operations ====================

  /**
   * Bulk update zone status
   * PATCH /coverage/zones/bulk/status
   */
  @Patch('zones/bulk/status')
  async bulkUpdateStatus(
    @CurrentUser() user: RequestUser,
    @Body() dto: BulkStatusUpdateDto,
  ) {
    const result = await this.coverageService.bulkUpdateStatus(
      user.organizationId,
      dto,
    );
    return {
      success: true,
      data: result,
      message: `${result.updated} zones updated`,
    };
  }
}
