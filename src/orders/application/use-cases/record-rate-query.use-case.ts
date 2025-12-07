import { Injectable, Inject } from '@nestjs/common';
import type { IRateHistoryRepository } from '../../domain/repositories/rate-history.repository.interface';
import { RATE_HISTORY_REPOSITORY } from '../../domain/repositories/constants';
import type { RateQueryCommand } from '@modules/orders/application/dto';

@Injectable()
export class RecordRateQueryUseCase {
  constructor(
    @Inject(RATE_HISTORY_REPOSITORY)
    private readonly rateHistoryRepository: IRateHistoryRepository,
  ) {}

  async execute(dto: RateQueryCommand) {
    return this.rateHistoryRepository.create(dto as any);
  }
}
