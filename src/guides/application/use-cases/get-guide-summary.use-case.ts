import { Injectable, Inject } from '@nestjs/common';
import type { IGuideRepository } from '../../domain/repositories/guide.repository.interface';
import { GUIDE_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class GetGuideSummaryUseCase {
  constructor(
    @Inject(GUIDE_REPOSITORY)
    private readonly guideRepository: IGuideRepository,
  ) {}

  async execute(userId: string, startDate?: Date, endDate?: Date) {
    return this.guideRepository.getSummaryByUser(userId, startDate, endDate);
  }
}
