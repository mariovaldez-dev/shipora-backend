import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { SeederService } from './seeder.service';
import { SalesOrderSchema } from '../../../orders/entities/sales-order.entity';
import { GuideSchema } from '../../../guides/entities/guide.entity';
import { UserSchema } from '../../../users/infrastructure/persistence/schema/user.schema';
import {
  OrganizationSchema,
  OrganizationMemberSchema,
} from '../../../organizations/infrastructure/persistence/schemas';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: 'SalesOrder', schema: SalesOrderSchema },
      { name: 'Guide', schema: GuideSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Organization', schema: OrganizationSchema },
      { name: 'OrganizationMember', schema: OrganizationMemberSchema },
    ]),
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
