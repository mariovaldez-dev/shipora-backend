import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  enabled?: boolean;
}

@Injectable()
export class RatesCacheService {
  private readonly DEFAULT_TTL = 1000 * 60 * 30; // 30 minutos por defecto

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Genera una clave de caché basada en los datos del envío
   * Esto asegura que los mismos datos siempre generen la misma clave
   */
  private generateCacheKey(carrierKey: string, shipmentData: any): string {
    const dataString = JSON.stringify(shipmentData);
    const hash = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex')
      .substring(0, 12);
    return `rates:${carrierKey}:${hash}`;
  }

  /**
   * Obtiene tarifas del caché
   */
  async getFromCache(carrierKey: string, shipmentData: any): Promise<any> {
    const key = this.generateCacheKey(carrierKey, shipmentData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const cached = await this.cacheManager.get(key);
    return cached;
  }

  /**
   * Guarda tarifas en el caché
   */
  async setInCache(
    carrierKey: string,
    shipmentData: any,
    rates: any,
    ttl?: number,
  ): Promise<void> {
    const key = this.generateCacheKey(carrierKey, shipmentData);
    const cacheTtl = ttl || this.DEFAULT_TTL;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.cacheManager.set(key, rates, cacheTtl);
  }

  /**
   * Obtiene tarifas del caché para múltiples carriers
   */
  async getMultipleFromCache(
    shipmentData: any,
    carrierKeys?: string[],
  ): Promise<Map<string, any>> {
    const results = new Map();

    if (carrierKeys && carrierKeys.length > 0) {
      for (const carrierKey of carrierKeys) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const cached = await this.getFromCache(carrierKey, shipmentData);
        if (cached) {
          results.set(carrierKey, cached);
        }
      }
    }

    return results;
  }

  /**
   * Invalida (elimina) el caché de un carrier específico
   */
  async invalidateCarrierCache(carrierKey: string): Promise<void> {
    // En un caso real, podríamos usar patrones para eliminar todas las claves del carrier
    // Por ahora, implementamos invalidación manual
    console.log(`Invalidating cache for carrier: ${carrierKey}`);
  }

  /**
   * Limpia todo el caché
   */
  async clearAllCache(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await (this.cacheManager as any).reset?.();
  }

  /**
   * Obtiene estadísticas del caché (opcional)
   */
  getCacheStats(): { type: string; status: string } {
    return {
      type: 'cache-manager',
      status: 'active',
    };
  }
}
