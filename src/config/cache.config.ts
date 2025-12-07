import { CacheModuleOptions } from '@nestjs/cache-manager';

/**
 * Configuración de caché para la aplicación
 * Por defecto usa caché en memoria, pero se puede configurar para Redis
 */
export const cacheConfig = (): CacheModuleOptions => {
  // const cacheStore = process.env.CACHE_STORE || 'memory'; // 'memory' o 'redis'
  const cacheTtl = parseInt(process.env.CACHE_TTL || '1800000', 10); // 30 min por defecto

  const config: CacheModuleOptions = {
    isGlobal: true,
    ttl: cacheTtl, // TTL en milisegundos
    max: 100, // Máximo de items en caché
  };

  // Si quieres usar Redis en lugar de memoria, descomenta y configura:
  // if (cacheStore === 'redis') {
  //   const redis = require('redis');
  //   config.store = redisStore;
  //   config.client = redis.createClient({
  //     host: process.env.REDIS_HOST || 'localhost',
  //     port: parseInt(process.env.REDIS_PORT || '6379', 10),
  //     password: process.env.REDIS_PASSWORD,
  //   });
  // }

  return config;
};

export default cacheConfig;
