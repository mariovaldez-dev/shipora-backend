import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Guide, GuideSchema } from './entities/guide.entity';
import { GuidesController } from './infrastructure/controllers/guides.controller';
import { GuideRepository } from './infrastructure/repositories/guide.repository';
import { GUIDE_REPOSITORY } from './domain/repositories/constants';
import { CreateGuideUseCase } from './application/use-cases/create-guide.use-case';
import { ListGuidesUseCase } from './application/use-cases/list-guides.use-case';
import { GetGuideUseCase } from './application/use-cases/get-guide.use-case';
import { UpdateGuideUseCase } from './application/use-cases/update-guide.use-case';
import { BatchOperationsUseCase } from './application/use-cases/batch-operations.use-case';
import { GetGuideSummaryUseCase } from './application/use-cases/get-guide-summary.use-case';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Guide.name, schema: GuideSchema }]),
  ],
  controllers: [GuidesController],
  providers: [
    // Repository
    { provide: GUIDE_REPOSITORY, useClass: GuideRepository },
    // Use Cases
    CreateGuideUseCase,
    ListGuidesUseCase,
    GetGuideUseCase,
    UpdateGuideUseCase,
    BatchOperationsUseCase,
    GetGuideSummaryUseCase,
  ],
  exports: [GUIDE_REPOSITORY, CreateGuideUseCase],
})
export class GuidesModule {}
