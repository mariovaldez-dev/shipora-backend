import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ShippingService } from '@modules/carriers/application/services/shipping.service';
import { RatesCacheService } from '@modules/carriers/application/services/cache.service';
import { GetRatesDto } from '@modules/carriers/application/dto/request/get-rates.dto';
import { CreateShipmentRequestDto } from '@modules/carriers/application/dto/request/create-shipments.request.dto';
import { RateStorageService } from '@modules/shared/services/rate-storage.service';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import utils from '@modules/core/shared/utils';

@Controller('shipping')
export class ShippingController {
  private readonly logger = new Logger(ShippingController.name);

  constructor(
    private readonly shippingService: ShippingService,
    private readonly cacheService: RatesCacheService,
    private readonly rateStorageService: RateStorageService,
  ) {}

  /**
   * Obtiene tarifas de un carrier específico
   * POST /shipping/:carrier/rates
   * Query params: ?noCache=true para omitir caché
   */
  @Post(':carrier/rates')
  getRates(
    @Param('carrier') carrier: string,
    @Body() shipmentData: GetRatesDto,
    @Query('noCache') noCache?: string,
  ) {
    const useCache = !noCache || noCache !== 'true';
    return this.shippingService.getRatesForShipment(
      carrier,
      shipmentData,
      useCache,
    );
  }

  /**
   * Obtiene tarifas de múltiples carriers simultáneamente
   * POST /shipping/rates/compare
   * Query params: ?carriers=paqueteexpress,nuevocarrier (opcional)
   *               ?noCache=true (opcional, para omitir caché)
   * Guarda automáticamente las tarifas consultadas en el historial
   */
  @Post('rates/compare')
  @UseGuards(JwtAuthGuard)
  async getMultipleRates(
    @Body() shipmentData: GetRatesDto,
    @Query('carriers') carrierList?: string,
    @Query('noCache') noCache?: string,
    @Request() req?: any,
  ) {
    const startTime = Date.now();
    const carriers = carrierList ? carrierList.split(',') : undefined;
    const useCache = !noCache || noCache !== 'true';

    // Generate a master rate ID for this query
    const masterRateId = `rate-${utils.generateShiporaId()}`;

    const results = await this.shippingService.getRatesFromMultipleCarriers(
      shipmentData,
      carriers,
      useCache,
    );

    const requestDuration = Date.now() - startTime;

    // Extract user info if authenticated
    const userId = req?.user?.userId;

    // Save rate query to history if user is authenticated
    if (userId && shipmentData.from && shipmentData.to) {
      try {
        // Calculate total weight and dimensions
        const totalWeight =
          shipmentData.products?.reduce(
            (sum, p) => sum + (p.dimensions?.weight || 0) * (p.quantity || 1),
            0,
          ) || 0;
        const maxDimensions = shipmentData.products?.reduce(
          (acc, p) => ({
            length: Math.max(acc.length, p.dimensions?.length || 0),
            width: Math.max(acc.width, p.dimensions?.width || 0),
            height: Math.max(acc.height, p.dimensions?.height || 0),
          }),
          { length: 0, width: 0, height: 0 },
        ) || { length: 0, width: 0, height: 0 };
        const totalValue =
          shipmentData.products?.reduce(
            (sum, p) => sum + (p.value || 0) * (p.quantity || 1),
            0,
          ) || 0;

        // Transform results to quotes format
        const quotes = results.flatMap((r: any) =>
          (r.rates || []).map((rate: any) => ({
            carrier: r.carrier || rate.carrier || 'unknown',
            serviceType: rate.serviceType || rate.service || 'standard',
            price: rate.total || rate.price || 0,
            estimatedDays: parseInt(
              rate.deliveryDays || rate.estimatedDays || '5',
              10,
            ),
            currency: rate.currency || 'MXN',
            rateId: rate.rateId || rate.id,
          })),
        );

        await this.rateStorageService.saveRateQuery({
          userId,
          masterRateId,
          originZipCode: shipmentData.from.zipCode || '',
          originCity: shipmentData.from.city || '',
          originState: shipmentData.from.state || '',
          originCountry: shipmentData.from.country || 'MX',
          destinationZipCode: shipmentData.to.zipCode || '',
          destinationCity: shipmentData.to.city || '',
          destinationState: shipmentData.to.state || '',
          destinationCountry: shipmentData.to.country || 'MX',
          weight: totalWeight,
          length: maxDimensions.length,
          width: maxDimensions.width,
          height: maxDimensions.height,
          declaredValue: totalValue,
          quotes,
          requestDuration,
          ipAddress: req?.ip || 'unknown',
          userAgent: req?.get?.('user-agent') || 'unknown',
        });

        this.logger.log(`Rate query saved with masterRateId: ${masterRateId}`);
      } catch (error) {
        // Log error but don't fail the request
        this.logger.error('Failed to save rate query:', error);
      }
    }

    // Return results with masterRateId for reference
    // Update each rate with the global masterRateId for consistency
    const resultsWithMasterId = results.map((carrierResult: any) => ({
      ...carrierResult,
      rates: (carrierResult.rates || []).map((rate: any) => ({
        ...rate,
        // Keep original carrier rate ID as carrierRateId
        carrierRateId: rate.masterRateId || rate.rateId,
        // Use the global masterRateId for all rates in this query
        masterRateId: masterRateId,
      })),
    }));

    return {
      masterRateId,
      results: resultsWithMasterId,
      requestDuration,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Lista todos los carriers disponibles
   * GET /shipping/carriers
   */
  @Get('carriers')
  getAvailableCarriers() {
    return this.shippingService.getAvailableCarriers();
  }

  /**
   * Obtiene estadísticas del caché
   * GET /shipping/cache/stats
   */
  @Get('cache/stats')
  getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Limpia todo el caché
   * DELETE /shipping/cache
   */
  @Delete('cache')
  async clearCache() {
    await this.cacheService.clearAllCache();
    return { message: 'Cache limpiado exitosamente', timestamp: new Date() };
  }

  /**
   * Invalida caché de un carrier específico
   * DELETE /shipping/cache/:carrier
   */
  @Delete('cache/:carrier')
  async invalidateCarrierCache(@Param('carrier') carrier: string) {
    await this.cacheService.invalidateCarrierCache(carrier);
    return {
      message: `Cache del carrier ${carrier} invalidado`,
      timestamp: new Date(),
    };
  }

  @Post(':carrier/shipments')
  createShipment(
    @Param('carrier') carrier: string,
    @Body() shipmentData: CreateShipmentRequestDto,
  ) {
    return this.shippingService.createShipment(carrier, shipmentData);
  }

  @Get(':carrier/track/:trackingNumber')
  trackShipment(
    @Param('carrier') carrier: string,
    @Param('trackingNumber') trackingNumber: string,
  ) {
    return this.shippingService.trackShipment(carrier, trackingNumber);
  }

  @Delete(':carrier/shipments/:trackingNumber')
  cancelShipment(
    @Param('carrier') carrier: string,
    @Param('trackingNumber') trackingNumber: string,
  ) {
    return this.shippingService.cancelShipment(carrier, trackingNumber);
  }
}
