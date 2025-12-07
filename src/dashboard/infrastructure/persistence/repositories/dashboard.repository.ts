import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { IDashboardRepository } from '../../../domain/repositories/dashboard.repository.interface';
import type {
  DashboardKPIs,
  RecentActivityItem,
  MonthlyTrend,
  CarrierStat,
  TopRoute,
} from '../../../domain/entities/dashboard.entity';

@Injectable()
export class DashboardRepository implements IDashboardRepository {
  constructor(
    @InjectModel('SalesOrder') private readonly orderModel: Model<any>,
    @InjectModel('Guide') private readonly guideModel: Model<any>,
  ) {}

  async getKPIs(userId: string): Promise<DashboardKPIs> {
    const userObjectId = this.toObjectId(userId);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get order counts by status
    const orderStats = await this.orderModel.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
        },
      },
    ]);

    // Get time-based order stats
    const [ordersToday, ordersThisWeek, ordersThisMonth] = await Promise.all([
      this.orderModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfToday },
      }),
      this.orderModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfWeek },
      }),
      this.orderModel.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: startOfMonth },
      }),
    ]);

    // Get guide stats
    const guideStats = await this.guideModel.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate revenue metrics
    const [revenueThisMonth, revenueLastMonth] = await Promise.all([
      this.orderModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: 'COMPLETED',
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalValue' } } },
      ]),
      this.orderModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            status: 'COMPLETED',
            createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalValue' } } },
      ]),
    ]);

    // Carrier statistics
    const carrierStats = await this.getCarrierStats(userObjectId);

    // Top routes
    const topRoutes = await this.getTopRoutes(userObjectId);

    // Recent activity
    const recentActivity = await this.getRecentActivityInternal(
      userObjectId,
      5,
    );

    // Monthly trends
    const monthlyTrends = await this.getMonthlyTrendsInternal(userObjectId, 6);

    // Process order stats
    const orderStatusMap = new Map(orderStats.map((s: any) => [s._id, s]));
    const guideStatusMap = new Map(
      guideStats.map((s: any) => [s._id, s.count]),
    );

    const totalOrders = orderStats.reduce(
      (sum: number, s: any) => sum + s.count,
      0,
    );
    const totalRevenue = orderStats.reduce(
      (sum: number, s: any) => sum + s.totalValue,
      0,
    );
    const completedOrders = orderStatusMap.get('COMPLETED')?.count || 0;
    const totalGuides = guideStats.reduce(
      (sum: number, s: any) => sum + s.count,
      0,
    );
    const deliveredGuides = guideStatusMap.get('DELIVERED') || 0;

    const thisMonthRev = revenueThisMonth[0]?.total || 0;
    const lastMonthRev = revenueLastMonth[0]?.total || 0;
    const revenueGrowth =
      lastMonthRev > 0
        ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
        : 0;

    // Calculate average delivery days from guides
    const avgDeliveryResult = await this.guideModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          status: 'DELIVERED',
          deliveredAt: { $exists: true },
          createdAt: { $exists: true },
        },
      },
      {
        $project: {
          deliveryDays: {
            $divide: [
              { $subtract: ['$deliveredAt', '$createdAt'] },
              1000 * 60 * 60 * 24, // Convert ms to days
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$deliveryDays' },
        },
      },
    ]);

    const averageDeliveryDays = avgDeliveryResult[0]?.avgDays || 2.5;

    return {
      // Orders metrics
      totalOrders,
      pendingOrders: orderStatusMap.get('PENDING')?.count || 0,
      shippedOrders:
        (orderStatusMap.get('PROCESSING')?.count || 0) +
        (orderStatusMap.get('CONFIRMED')?.count || 0),
      deliveredOrders: completedOrders,
      cancelledOrders: orderStatusMap.get('CANCELLED')?.count || 0,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,

      // Revenue metrics
      totalRevenue,
      revenueThisMonth: thisMonthRev,
      revenueLastMonth: lastMonthRev,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      averageOrderValue:
        totalOrders > 0
          ? Math.round((totalRevenue / totalOrders) * 100) / 100
          : 0,

      // Guides metrics
      totalGuides,
      guidesInTransit:
        (guideStatusMap.get('IN_TRANSIT') || 0) +
        (guideStatusMap.get('OUT_FOR_DELIVERY') || 0),
      guidesDelivered: deliveredGuides,
      guidesPending:
        (guideStatusMap.get('PENDING') || 0) +
        (guideStatusMap.get('LABEL_CREATED') || 0),
      guidesCancelled: guideStatusMap.get('CANCELLED') || 0,

      // Performance metrics
      deliverySuccessRate:
        totalGuides > 0
          ? Math.round((deliveredGuides / totalGuides) * 1000) / 10
          : 0,
      averageDeliveryDays: Math.round(averageDeliveryDays * 10) / 10,
      onTimeDeliveryRate: 94.5, // TODO: Calculate based on estimated vs actual delivery

      // Carrier breakdown
      carrierStats,

      // Top routes
      topRoutes,

      // Recent activity
      recentActivity,

      // Monthly trends
      monthlyTrends,
    };
  }

  private toObjectId(id: string): Types.ObjectId | string {
    try {
      return new Types.ObjectId(id);
    } catch {
      return id;
    }
  }

  private async getCarrierStats(
    userId: Types.ObjectId | string,
  ): Promise<CarrierStat[]> {
    const stats = await this.guideModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$carrier.name',
          count: { $sum: 1 },
          totalCost: { $sum: '$pricing.total' },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const totalGuides = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    // Calculate average delivery days per carrier
    const deliveryTimes = await this.guideModel.aggregate([
      {
        $match: {
          userId,
          status: 'DELIVERED',
          deliveredAt: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$carrier.name',
          avgDays: {
            $avg: {
              $divide: [
                { $subtract: ['$deliveredAt', '$createdAt'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
    ]);

    const deliveryTimeMap = new Map(
      deliveryTimes.map((d: any) => [d._id, d.avgDays]),
    );

    return stats.map((s: any) => ({
      carrier: s._id || 'Unknown',
      count: s.count,
      percentage:
        totalGuides > 0 ? Math.round((s.count / totalGuides) * 1000) / 10 : 0,
      averageCost:
        s.count > 0 ? Math.round((s.totalCost / s.count) * 100) / 100 : 0,
      averageDeliveryDays:
        Math.round((deliveryTimeMap.get(s._id) || 2.5) * 10) / 10,
    }));
  }

  private async getTopRoutes(
    userId: Types.ObjectId | string,
  ): Promise<TopRoute[]> {
    const routes = await this.orderModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            origin: '$shippingFrom.city',
            destination: '$shippingTo.city',
          },
          count: { $sum: 1 },
          totalCost: { $sum: '$shippingCost' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return routes.map((r: any) => ({
      origin: r._id.origin || 'Unknown',
      destination: r._id.destination || 'Unknown',
      count: r.count,
      averageCost:
        r.count > 0 ? Math.round((r.totalCost / r.count) * 100) / 100 : 0,
    }));
  }

  private async getRecentActivityInternal(
    userId: Types.ObjectId | string,
    limit: number,
  ): Promise<RecentActivityItem[]> {
    // Get recent orders
    const recentOrders = await this.orderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get recent guides
    const recentGuides = await this.guideModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Combine and format
    const activities: RecentActivityItem[] = [];

    recentOrders.forEach((order: any) => {
      const statusMap: Record<string, string> = {
        PENDING: 'pending',
        CONFIRMED: 'processing',
        PROCESSING: 'processing',
        COMPLETED: 'delivered',
        CANCELLED: 'cancelled',
      };

      activities.push({
        id: order._id.toString(),
        type: 'order',
        title: this.getOrderActivityTitle(order.status),
        description: `Orden #${order.orderNumber} - ${order.shippingTo?.city || 'N/A'}`,
        timestamp: new Date(order.createdAt),
        status: statusMap[order.status] || 'pending',
      });
    });

    recentGuides.forEach((guide: any) => {
      const typeMap: Record<string, 'guide' | 'shipment' | 'delivery'> = {
        PENDING: 'guide',
        LABEL_CREATED: 'guide',
        PICKED_UP: 'shipment',
        IN_TRANSIT: 'shipment',
        OUT_FOR_DELIVERY: 'shipment',
        DELIVERED: 'delivery',
        CANCELLED: 'guide',
      };

      const statusMap: Record<string, string> = {
        PENDING: 'pending',
        LABEL_CREATED: 'active',
        PICKED_UP: 'active',
        IN_TRANSIT: 'in_transit',
        OUT_FOR_DELIVERY: 'in_transit',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
      };

      activities.push({
        id: guide._id.toString(),
        type: typeMap[guide.status] || 'guide',
        title: this.getGuideActivityTitle(guide.status),
        description: `${guide.carrier?.name || 'Carrier'} #${guide.trackingNumber} - ${guide.destination?.city || 'N/A'}`,
        timestamp: new Date(guide.createdAt),
        status: statusMap[guide.status] || 'pending',
      });
    });

    // Sort by timestamp and return limited results
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  private getOrderActivityTitle(status: string): string {
    const titles: Record<string, string> = {
      PENDING: 'Nueva orden creada',
      CONFIRMED: 'Orden confirmada',
      PROCESSING: 'Orden en proceso',
      COMPLETED: 'Orden completada',
      CANCELLED: 'Orden cancelada',
    };
    return titles[status] || 'Actualización de orden';
  }

  private getGuideActivityTitle(status: string): string {
    const titles: Record<string, string> = {
      PENDING: 'Guía pendiente',
      LABEL_CREATED: 'Etiqueta generada',
      PICKED_UP: 'Paquete recolectado',
      IN_TRANSIT: 'Envío en tránsito',
      OUT_FOR_DELIVERY: 'En camino para entrega',
      DELIVERED: 'Entrega completada',
      CANCELLED: 'Guía cancelada',
    };
    return titles[status] || 'Actualización de guía';
  }

  async getRecentActivity(
    userId: string,
    limit: number,
  ): Promise<RecentActivityItem[]> {
    return this.getRecentActivityInternal(this.toObjectId(userId), limit);
  }

  async getMonthlyTrends(
    userId: string,
    months: number,
  ): Promise<MonthlyTrend[]> {
    return this.getMonthlyTrendsInternal(this.toObjectId(userId), months);
  }

  private async getMonthlyTrendsInternal(
    userId: Types.ObjectId | string,
    months: number,
  ): Promise<MonthlyTrend[]> {
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months + 1,
      1,
    );

    // Aggregate orders by month
    const orderTrends = await this.orderModel.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalValue' },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Aggregate guides by month
    const guideTrends = await this.guideModel.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          guides: { $sum: 1 },
        },
      },
    ]);

    const guideMap = new Map(
      guideTrends.map((g: any) => [`${g._id.year}-${g._id.month}`, g.guides]),
    );

    // Build trends array for each month
    const trends: MonthlyTrend[] = [];
    for (let i = 0; i < months; i++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - months + 1 + i,
        1,
      );
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // MongoDB months are 1-indexed

      const orderData = orderTrends.find(
        (o: any) => o._id.year === year && o._id.month === month,
      );

      trends.push({
        month: monthNames[date.getMonth()],
        year,
        orders: orderData?.orders || 0,
        guides: guideMap.get(`${year}-${month}`) || 0,
        revenue: orderData?.revenue || 0,
        delivered: orderData?.delivered || 0,
      });
    }

    return trends;
  }
}
