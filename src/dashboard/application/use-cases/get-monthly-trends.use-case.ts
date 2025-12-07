import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '../../domain/repositories/constants';
import type { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import type { MonthlyTrend } from '../../domain/entities/dashboard.entity';

@Injectable()
export class GetMonthlyTrendsUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  async execute(userId: string, months: number = 6): Promise<MonthlyTrend[]> {
    const safeMonths = Math.min(Math.max(1, months), 12);
    return this.dashboardRepository.getMonthlyTrends(userId, safeMonths);
  }
}
