export interface CarrierStat {
  carrier: string;
  count: number;
  percentage: number;
  averageCost: number;
  averageDeliveryDays: number;
}

export interface TopRoute {
  origin: string;
  destination: string;
  count: number;
  averageCost: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'order' | 'guide' | 'shipment' | 'delivery' | 'payment';
  title: string;
  description: string;
  timestamp: Date;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  orders: number;
  guides: number;
  revenue: number;
  delivered: number;
}

export interface DashboardKPIs {
  // Orders metrics
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;

  // Revenue metrics
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueGrowth: number;
  averageOrderValue: number;

  // Guides metrics
  totalGuides: number;
  guidesInTransit: number;
  guidesDelivered: number;
  guidesPending: number;
  guidesCancelled: number;

  // Performance metrics
  deliverySuccessRate: number;
  averageDeliveryDays: number;
  onTimeDeliveryRate: number;

  // Carrier breakdown
  carrierStats: CarrierStat[];

  // Top routes
  topRoutes: TopRoute[];

  // Recent activity
  recentActivity: RecentActivityItem[];

  // Monthly trends
  monthlyTrends: MonthlyTrend[];
}
