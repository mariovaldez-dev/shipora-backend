import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CoverageZone,
  CoverageZoneSchema,
} from './entities/coverage-zone.entity';
import { CoverageService } from './services/coverage.service';
import { CoverageController } from './controllers/coverage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoverageZone.name, schema: CoverageZoneSchema },
    ]),
  ],
  providers: [CoverageService],
  controllers: [CoverageController],
  exports: [CoverageService],
})
export class CoverageModule {}
