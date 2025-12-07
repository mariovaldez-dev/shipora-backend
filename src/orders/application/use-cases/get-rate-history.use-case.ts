import { Injectable, Inject } from '@nestjs/common';
import type { IRateHistoryRepository } from '../../domain/repositories/rate-history.repository.interface';
import { RATE_HISTORY_REPOSITORY } from '../../domain/repositories/constants';

@Injectable()
export class GetRateHistoryUseCase {
  constructor(
    @Inject(RATE_HISTORY_REPOSITORY)
    private readonly rateHistoryRepository: IRateHistoryRepository,
  ) {}

  async execute(userId: string, limit = 100, skip = 0) {
    return this.rateHistoryRepository.findByUserId(userId, limit, skip);
  }
}
