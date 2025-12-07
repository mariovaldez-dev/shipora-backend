import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesOrder, SalesOrderSchema } from './entities/sales-order.entity';
import { Shipment, ShipmentSchema } from './entities/shipment.entity';
import { RateHistory, RateHistorySchema } from './entities/rate-history.entity';
import { OrdersService } from './services/orders.service';
import { OrdersController } from './infrastructure/controllers/orders.controller';
import { ShipmentController } from './infrastructure/controllers/shipment.controller';
import { CreateSalesOrderUseCase } from './application/use-cases/create-sales-order.use-case';
import { CreateShipmentUseCase } from './application/use-cases/create-shipment.use-case';
import { ListUserOrdersUseCase } from './application/use-cases/list-user-orders.use-case';
import { RecordRateQueryUseCase } from './application/use-cases/record-rate-query.use-case';
import { GetRateHistoryUseCase } from './application/use-cases/get-rate-history.use-case';
import { GetCarrierStatsUseCase } from './application/use-cases/get-carrier-stats.use-case';
import { GetTopRoutesUseCase } from './application/use-cases/get-top-routes.use-case';
import { GetSalesOrderUseCase } from './application/use-cases/get-sales-order.use-case';
import { SalesOrderRepository } from './infrastructure/repositories/sales-order.repository';
import { ShipmentRepository } from './infrastructure/repositories/shipment.repository';
import { RateHistoryRepository } from './infrastructure/repositories/rate-history.repository';
import {
  SALES_ORDER_REPOSITORY,
  SHIPMENT_REPOSITORY,
  RATE_HISTORY_REPOSITORY,
} from './domain/repositories/constants';
import { GuidesModule } from '@modules/guides/guides.module';
import { ShippingModule } from '@modules/shipping/shipping.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: RateHistory.name, schema: RateHistorySchema },
    ]),
    GuidesModule,
    ShippingModule,
  ],
  providers: [
    OrdersService,
    // repositories (provided under tokens)
    { provide: SALES_ORDER_REPOSITORY, useClass: SalesOrderRepository },
    { provide: SHIPMENT_REPOSITORY, useClass: ShipmentRepository },
    { provide: RATE_HISTORY_REPOSITORY, useClass: RateHistoryRepository },
    // use-cases
    CreateSalesOrderUseCase,
    ListUserOrdersUseCase,
    RecordRateQueryUseCase,
    GetRateHistoryUseCase,
    GetCarrierStatsUseCase,
    GetTopRoutesUseCase,
    GetSalesOrderUseCase,
    CreateShipmentUseCase,
  ],
  controllers: [OrdersController, ShipmentController],
  exports: [OrdersService],
})
export class OrdersModule {}
