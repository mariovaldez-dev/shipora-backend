import { Injectable, Inject } from '@nestjs/common';
import type { IGuideRepository, GuideFilters, PaginationParams } from '../../domain/repositories/guide.repository.interface';
import { GUIDE_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class ListGuidesUseCase {
  constructor(
    @Inject(GUIDE_REPOSITORY)
    private readonly guideRepository: IGuideRepository,
  ) {}

  async execute(
    userId: string,
    filters: Partial<GuideFilters> = {},
    pagination: PaginationParams = { limit: 50, skip: 0 },
  ) {
    const fullFilters: GuideFilters = {
      ...filters,
      userId,
    };

    const [guides, total] = await Promise.all([
      this.guideRepository.findWithFilters(fullFilters, pagination),
      this.guideRepository.countWithFilters(fullFilters),
    ]);

    return {
      data: guides,
      pagination: {
        total,
        limit: pagination.limit,
        skip: pagination.skip,
        hasMore: pagination.skip + guides.length < total,
      },
    };
  }
}
