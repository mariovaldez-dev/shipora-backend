import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '../../domain/repositories/constants';
import type { IDashboardRepository } from '../../domain/repositories/dashboard.repository.interface';
import type { DashboardKPIs } from '../../domain/entities/dashboard.entity';

@Injectable()
export class GetKPIsUseCase {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  async execute(userId: string): Promise<DashboardKPIs> {
    return this.dashboardRepository.getKPIs(userId);
  }
}
