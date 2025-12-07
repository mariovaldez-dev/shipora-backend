import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '../../domain/repositories/constants';
import type { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import type { RecentActivityItem } from '../../domain/entities/dashboard.entity';

@Injectable()
export class GetRecentActivityUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  async execute(
    userId: string,
    limit: number = 10,
  ): Promise<RecentActivityItem[]> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    return this.dashboardRepository.getRecentActivity(userId, safeLimit);
  }
}
