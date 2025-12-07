import { RateHistory } from '../../entities/rate-history.entity';

export interface IRateHistoryRepository {
  create(data: Partial<RateHistory>): Promise<RateHistory>;
  findByUserId(
    userId: string,
    limit: number,
    skip: number,
  ): Promise<RateHistory[]>;
  aggregateCarrierStats(userId: string, start: Date, end: Date): Promise<any[]>;
  aggregateTopRoutes(userId: string, limit: number): Promise<any[]>;
}
