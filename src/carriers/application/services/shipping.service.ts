/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, Logger } from '@nestjs/common';
import { ShippingCarrierFactory } from '../factories/shipping-carrier.factory';
import { RatesCacheService } from './cache.service';
import { GetRatesDto } from '@modules/carriers/application/dto/request/get-rates.dto';
import utils from '@modules/core/shared/utils';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly carrierFactory: ShippingCarrierFactory,
    private readonly cacheService: RatesCacheService,
  ) {}

  /**
   * Obtiene tarifas de un carrier específico
   * Implementa caché automático para mejorar performance
   * @param carrierKey - ID del carrier (ej: 'paqueteexpress')
   * @param shipmentData - Datos del envío
   * @param useCache - Si se debe usar caché (por defecto true)
   */
  async getRatesForShipment(
    carrierKey: string,
    shipmentData: GetRatesDto,
    useCache = true,
  ) {
    if (useCache) {
      // Intentar obtener del caché
      const cachedRates = await this.cacheService.getFromCache(
        carrierKey,
        shipmentData,
      );
      if (cachedRates) {
        this.logger.debug(`Tarifas obtenidas del caché para ${carrierKey}`);
        return cachedRates;
      }
    }

    // Si no está en caché, obtener del carrier
    const carrier = this.carrierFactory.getCarrier(carrierKey);
    const rates = await carrier.getRates(shipmentData, carrierKey);

    // Guardar en caché para futuras consultas
    await this.cacheService.setInCache(carrierKey, shipmentData, rates);

    return rates;
  }

  /**
   * Obtiene tarifas de múltiples carriers simultáneamente
   * Útil para comparar precios entre diferentes transportistas
   * Implementa caché inteligente que consulta solo lo que no esté en caché
   * @param shipmentData - Datos del envío
   * @param carrierKeys - Array de IDs de carriers (si está vacío, consulta todos disponibles)
   * @param useCache - Si se debe usar caché (por defecto true)
   */
  async getRatesFromMultipleCarriers(
    shipmentData: GetRatesDto,
    carrierKeys?: string[],
    useCache = true,
  ) {
    const allCarriers = this.carrierFactory.getAllCarriers();
    const carriersToQuery = carrierKeys
      ? allCarriers.filter((c: any) => carrierKeys.includes(c.strategyKey))
      : allCarriers;

    // Obtener del caché lo que esté disponible
    const cachedResults = useCache
      ? await this.cacheService.getMultipleFromCache(shipmentData, carrierKeys)
      : new Map();

    // Identificar qué carriers necesitan ser consultados
    const carriersNeedingFetch = carriersToQuery.filter(
      (carrier: any) => !cachedResults.has(carrier.strategyKey),
    );

    // Consultar a los carriers que no están en caché
    const ratesPromises = carriersNeedingFetch.map((carrier: any) =>
      carrier
        .getRates(shipmentData, carrier.strategyKey)
        .then((rates: any) => {
          // Guardar en caché mientras consultamos
          this.cacheService
            .setInCache(carrier.strategyKey, shipmentData, rates)
            .catch((error: any) => {
              this.logger.warn(
                `Error guardando en caché para ${carrier.strategyKey}`,
                error,
              );
            });

          return {
            carrier: carrier.strategyKey,
            rates,
            success: true,
          };
        })
        .catch((error: any) => ({
          carrier: carrier.strategyKey,
          rates: [],
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })),
    );

    const fetchedRates = await Promise.all(ratesPromises);

    // Combinar resultados: caché + consultados
    const allResults = Array.from(cachedResults.entries()).map(
      ([carrierKey, rates]) => ({
        carrier: carrierKey,
        rates,
        success: true,
        source: 'cache',
      }),
    );

    return [...allResults, ...fetchedRates];
  }

  /**
   * Obtiene lista de todos los carriers disponibles
   */
  getAvailableCarriers() {
    return this.carrierFactory.getAllCarriers().map((c: any) => ({
      key: c.strategyKey,
      name: c.constructor.name,
    }));
  }

  async createShipment(carrierKey: string, shipmentData: GetRatesDto) {
    const carrier = this.carrierFactory.getCarrier(carrierKey);
    return carrier.createShipment(shipmentData, utils.generateShiporaId());
  }

  async trackShipment(carrierKey: string, trackingNumber: string) {
    const carrier = this.carrierFactory.getCarrier(carrierKey);
    return carrier.trackShipment(trackingNumber);
  }

  async cancelShipment(carrierKey: string, trackingNumber: string) {
    const carrier = this.carrierFactory.getCarrier(carrierKey);
    return carrier.cancelShipment(trackingNumber);
  }
}
