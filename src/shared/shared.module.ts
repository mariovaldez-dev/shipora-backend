import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RateStorageService } from './services/rate-storage.service';
import {
  RateHistory,
  RateHistorySchema,
} from '@modules/orders/entities/rate-history.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RateHistory.name, schema: RateHistorySchema },
    ]),
  ],
  providers: [RateStorageService],
  exports: [RateStorageService],
})
export class SharedModule {}
