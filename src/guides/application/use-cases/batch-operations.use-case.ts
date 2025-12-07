import { Injectable, Inject } from '@nestjs/common';
import type { IGuideRepository } from '../../domain/repositories/guide.repository.interface';
import { GUIDE_REPOSITORY } from '../../domain/repositories/constants';
import { GuideStatus } from '../../entities/guide.entity';

@Injectable()
export class BatchOperationsUseCase {
  constructor(
    @Inject(GUIDE_REPOSITORY)
    private readonly guideRepository: IGuideRepository,
  ) {}

  async batchUpdateStatus(guideIds: string[], status: GuideStatus) {
    const modifiedCount = await this.guideRepository.batchUpdateStatus(guideIds, status);
    return {
      modifiedCount,
      message: `${modifiedCount} guides updated to status ${status}`,
    };
  }

  async batchMarkAsPrinted(guideIds: string[], printedBy: string) {
    const modifiedCount = await this.guideRepository.batchMarkAsPrinted(guideIds, printedBy);
    return {
      modifiedCount,
      message: `${modifiedCount} guides marked as printed`,
    };
  }

  async batchMarkAsShipped(guideIds: string[], shippedBy: string) {
    const modifiedCount = await this.guideRepository.batchMarkAsShipped(guideIds, shippedBy);
    return {
      modifiedCount,
      message: `${modifiedCount} guides marked as shipped`,
    };
  }
}
