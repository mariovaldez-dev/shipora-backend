import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tracking, TrackingSchema } from './entities/tracking.entity';
import { TrackingService } from './services/tracking.service';
import { TrackingController } from './controllers/tracking.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tracking.name, schema: TrackingSchema },
    ]),
  ],
  providers: [TrackingService],
  controllers: [TrackingController],
  exports: [TrackingService],
})
export class TrackingModule {}
