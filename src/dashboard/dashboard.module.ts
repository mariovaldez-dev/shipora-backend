import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './infrastructure/controllers/dashboard.controller';
import { DashboardRepository } from './infrastructure/persistence/repositories/dashboard.repository';
import { GetKPIsUseCase } from './application/use-cases/get-kpis.use-case';
import { GetRecentActivityUseCase } from './application/use-cases/get-recent-activity.use-case';
import { GetMonthlyTrendsUseCase } from './application/use-cases/get-monthly-trends.use-case';
import { DASHBOARD_REPOSITORY } from './domain/repositories/constants';
import { SalesOrderSchema } from '../orders/entities/sales-order.entity';
import { GuideSchema } from '../guides/entities/guide.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SalesOrder', schema: SalesOrderSchema },
      { name: 'Guide', schema: GuideSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: DashboardRepository,
    },
    GetKPIsUseCase,
    GetRecentActivityUseCase,
    GetMonthlyTrendsUseCase,
  ],
  exports: [DASHBOARD_REPOSITORY],
})
export class DashboardModule {}
