/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PaqueteExpressCarrier } from '../carriers/implementations/paquete-express.carrier';
import { FedExCarrier } from '../carriers/implementations/fedex.carrier';
import { DHLCarrier } from '../carriers/implementations/dhl.carrier';
import { ShippingController } from './infrastructure/controllers/shipping.controller';
import { ShippingService } from '@modules/carriers/application/services/shipping.service';
import { ShippingCarrierFactory } from '@modules/carriers/application/factories/shipping-carrier.factory';
import { RatesCacheService } from '@modules/carriers/application/services/cache.service';
import { SHIPPING_CARRIER } from '@modules/carriers/domain/carrier.interface';
import { PaqueteExpressAdapter } from '@modules/carriers/insfrastructure/adapters/paqueteexpress.adapter';
import { HttpModule } from '@nestjs/axios';
import cacheConfig from '@config/cache.config';
import { DocumentsModule } from '../documents/documents.module';
import { SharedModule } from '@modules/shared/shared.module';

// ¡La magia de la escalabilidad está aquí!
// Para agregar un nuevo transportista, solo lo añades a este array.
const carrierImplementations = [
  PaqueteExpressCarrier,
  FedExCarrier,
  DHLCarrier,
];

@Module({
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingCarrierFactory,
    RatesCacheService,
    PaqueteExpressAdapter,
    ...carrierImplementations,
    {
      provide: SHIPPING_CARRIER,
      useFactory: (...carriers) => carriers,
      inject: carrierImplementations,
    },
  ],
  imports: [
    HttpModule,
    CacheModule.register(cacheConfig()),
    DocumentsModule,
    SharedModule,
  ],
  exports: [ShippingService, ShippingCarrierFactory],
})
export class ShippingModule {}
