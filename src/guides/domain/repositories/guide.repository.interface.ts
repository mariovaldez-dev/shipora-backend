import { Guide, GuideStatus } from '../../entities/guide.entity';

export interface GuideFilters {
  userId?: string;
  status?: GuideStatus | GuideStatus[];
  carrierId?: string;
  orderId?: string;
  isPrinted?: boolean;
  isShipped?: boolean;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginationParams {
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GuideSummary {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
}

export interface IGuideRepository {
  create(data: Partial<Guide>): Promise<Guide>;
  findById(id: string): Promise<Guide | null>;
  findByTrackingNumber(trackingNumber: string): Promise<Guide | null>;
  findByUserId(userId: string, pagination: PaginationParams): Promise<Guide[]>;
  findWithFilters(filters: GuideFilters, pagination: PaginationParams): Promise<Guide[]>;
  countWithFilters(filters: GuideFilters): Promise<number>;
  updateStatus(id: string, status: GuideStatus, metadata?: Record<string, any>): Promise<Guide | null>;
  updateById(id: string, data: Partial<Guide>): Promise<Guide | null>;
  addTrackingEvent(id: string, event: any): Promise<Guide | null>;
  markAsPrinted(id: string, printedBy: string): Promise<Guide | null>;
  markAsShipped(id: string, shippedBy: string): Promise<Guide | null>;
  updatePriority(id: string, priority: string): Promise<Guide | null>;
  getSummaryByUser(userId: string, startDate?: Date, endDate?: Date): Promise<GuideSummary>;
  batchUpdateStatus(ids: string[], status: GuideStatus): Promise<number>;
  batchMarkAsPrinted(ids: string[], printedBy: string): Promise<number>;
  batchMarkAsShipped(ids: string[], shippedBy: string): Promise<number>;
}
