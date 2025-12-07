import type {
  DashboardKPIs,
  RecentActivityItem,
  MonthlyTrend,
} from '../entities/dashboard.entity';

export interface IDashboardRepository {
  getKPIs(userId: string): Promise<DashboardKPIs>;
  getRecentActivity(
    userId: string,
    limit: number,
  ): Promise<RecentActivityItem[]>;
  getMonthlyTrends(userId: string, months: number): Promise<MonthlyTrend[]>;
}
