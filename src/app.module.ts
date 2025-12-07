import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '@shared/infrastructure/database/database.module';
import { UsersModule } from '@modules/users/users.module';
import { RolesModule } from '@modules/roles/roles.module';
import { AuthModule } from '@modules/auth/auth.module';
import databaseConfig from '@config/database.config';
import jwtConfig from '@config/jwt.config';
import { ShippingModule } from './shipping/shipping.module';
import { DocumentsModule } from './documents/documents.module';
import { OrdersModule } from './orders/orders.module';
import { GuidesModule } from './guides/guides.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SeederModule } from './shared/infrastructure/database/seeder.module';
import { CoverageModule } from './coverage/coverage.module';
import { TrackingModule } from './tracking/tracking.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ShippingModule,
    DocumentsModule,
    OrdersModule,
    GuidesModule,
    DashboardModule,
    OrganizationsModule,
    SeederModule,
    CoverageModule,
    TrackingModule,
    NotificationsModule,
  ],
})
export class AppModule {}
