import { Injectable, Inject } from '@nestjs/common';
import type { IRateHistoryRepository } from '../../domain/repositories/rate-history.repository.interface';
import { RATE_HISTORY_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class GetCarrierStatsUseCase {
  constructor(
    @Inject(RATE_HISTORY_REPOSITORY)
    private readonly rateHistoryRepository: IRateHistoryRepository,
  ) {}

  async execute(userId: string, start: Date, end: Date) {
    return this.rateHistoryRepository.aggregateCarrierStats(userId, start, end);
  }
}
