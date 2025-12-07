import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/infrastructure/guards/jwt-auth.guard';
import { GetKPIsUseCase } from '../../application/use-cases/get-kpis.use-case';
import { GetRecentActivityUseCase } from '../../application/use-cases/get-recent-activity.use-case';
import { GetMonthlyTrendsUseCase } from '../../application/use-cases/get-monthly-trends.use-case';

interface AuthenticatedRequest {
  user?: { userId: string };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly getKPIsUseCase: GetKPIsUseCase,
    private readonly getRecentActivityUseCase: GetRecentActivityUseCase,
    private readonly getMonthlyTrendsUseCase: GetMonthlyTrendsUseCase,
  ) {}

  /**
   * Get all dashboard KPIs
   * GET /dashboard/kpis
   */
  @Get('kpis')
  async getKPIs(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    return this.getKPIsUseCase.execute(userId);
  }

  /**
   * Get recent activity
   * GET /dashboard/activity?limit=10
   */
  @Get('activity')
  async getRecentActivity(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const limitNum = parseInt(limit || '10', 10);
    return this.getRecentActivityUseCase.execute(userId, limitNum);
  }

  /**
   * Get monthly trends
   * GET /dashboard/trends?months=6
   */
  @Get('trends')
  async getMonthlyTrends(
    @Request() req: AuthenticatedRequest,
    @Query('months') months?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const monthsNum = parseInt(months || '6', 10);
    return this.getMonthlyTrendsUseCase.execute(userId, monthsNum);
  }
}
