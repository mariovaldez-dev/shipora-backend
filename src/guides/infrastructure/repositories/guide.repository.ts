import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Guide, GuideStatus } from '../../entities/guide.entity';
import {
  IGuideRepository,
  GuideFilters,
  PaginationParams,
  GuideSummary,
} from '../../domain/repositories/guide.repository.interface';

@Injectable()
export class GuideRepository implements IGuideRepository {
  constructor(
    @InjectModel(Guide.name) private readonly guideModel: Model<Guide>,
  ) {}

  async create(data: Partial<Guide>): Promise<Guide> {
    const guide = new this.guideModel(data);
    return guide.save();
  }

  async findById(id: string): Promise<Guide | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.guideModel.findById(id).exec();
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Guide | null> {
    return this.guideModel.findOne({ trackingNumber }).exec();
  }

  async findByUserId(userId: string, pagination: PaginationParams): Promise<Guide[]> {
    const { limit, skip, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    
    return this.guideModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findWithFilters(filters: GuideFilters, pagination: PaginationParams): Promise<Guide[]> {
    const query = this.buildFilterQuery(filters);
    const { limit, skip, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    return this.guideModel
      .find(query)
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countWithFilters(filters: GuideFilters): Promise<number> {
    const query = this.buildFilterQuery(filters);
    return this.guideModel.countDocuments(query).exec();
  }

  private buildFilterQuery(filters: GuideFilters): Record<string, any> {
    const query: Record<string, any> = {};

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    if (filters.status) {
      query.status = Array.isArray(filters.status) 
        ? { $in: filters.status } 
        : filters.status;
    }

    if (filters.carrierId) {
      query['carrier.id'] = filters.carrierId;
    }

    if (filters.orderId) {
      query.orderId = new Types.ObjectId(filters.orderId);
    }

    if (typeof filters.isPrinted === 'boolean') {
      query.isPrinted = filters.isPrinted;
    }

    if (typeof filters.isShipped === 'boolean') {
      query.isShipped = filters.isShipped;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters.search) {
      query.$or = [
        { trackingNumber: { $regex: filters.search, $options: 'i' } },
        { 'destination.contactName': { $regex: filters.search, $options: 'i' } },
        { 'destination.city': { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  async updateStatus(id: string, status: GuideStatus, metadata?: Record<string, any>): Promise<Guide | null> {
    const updateData: any = { status };
    
    if (status === GuideStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === GuideStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      if (metadata?.reason) updateData.cancelReason = metadata.reason;
    } else if (status === GuideStatus.PICKED_UP) {
      updateData.shippedAt = new Date();
    }

    return this.guideModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
  }

  async updateById(id: string, data: Partial<Guide>): Promise<Guide | null> {
    return this.guideModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async addTrackingEvent(id: string, event: any): Promise<Guide | null> {
    return this.guideModel
      .findByIdAndUpdate(
        id,
        { $push: { trackingHistory: { ...event, timestamp: new Date() } } },
        { new: true },
      )
      .exec();
  }

  async markAsPrinted(id: string, printedBy: string): Promise<Guide | null> {
    return this.guideModel
      .findByIdAndUpdate(
        id,
        { $set: { isPrinted: true, printedAt: new Date(), printedBy } },
        { new: true },
      )
      .exec();
  }

  async markAsShipped(id: string, shippedBy: string): Promise<Guide | null> {
    return this.guideModel
      .findByIdAndUpdate(
        id,
        { 
          $set: { 
            isShipped: true, 
            shippedAt: new Date(), 
            shippedBy,
            status: GuideStatus.PICKED_UP,
          } 
        },
        { new: true },
      )
      .exec();
  }

  async updatePriority(id: string, priority: string): Promise<Guide | null> {
    return this.guideModel
      .findByIdAndUpdate(id, { $set: { priority } }, { new: true })
      .exec();
  }

  async getSummaryByUser(userId: string, startDate?: Date, endDate?: Date): Promise<GuideSummary> {
    const matchStage: any = { userId: new Types.ObjectId(userId) };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const result = await this.guideModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', GuideStatus.PENDING] }, 1, 0] },
          },
          inTransit: {
            $sum: {
              $cond: [
                { $in: ['$status', [GuideStatus.IN_TRANSIT, GuideStatus.PICKED_UP, GuideStatus.OUT_FOR_DELIVERY]] },
                1,
                0,
              ],
            },
          },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', GuideStatus.DELIVERED] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', GuideStatus.CANCELLED] }, 1, 0] },
          },
          totalRevenue: { $sum: '$pricing.total' },
        },
      },
    ]).exec();

    return result[0] || {
      total: 0,
      pending: 0,
      inTransit: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
    };
  }

  async batchUpdateStatus(ids: string[], status: GuideStatus): Promise<number> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const result = await this.guideModel
      .updateMany({ _id: { $in: objectIds } }, { $set: { status } })
      .exec();
    return result.modifiedCount;
  }

  async batchMarkAsPrinted(ids: string[], printedBy: string): Promise<number> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const result = await this.guideModel
      .updateMany(
        { _id: { $in: objectIds } },
        { $set: { isPrinted: true, printedAt: new Date(), printedBy } },
      )
      .exec();
    return result.modifiedCount;
  }

  async batchMarkAsShipped(ids: string[], shippedBy: string): Promise<number> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    const result = await this.guideModel
      .updateMany(
        { _id: { $in: objectIds } },
        { 
          $set: { 
            isShipped: true, 
            shippedAt: new Date(), 
            shippedBy,
            status: GuideStatus.PICKED_UP,
          } 
        },
      )
      .exec();
    return result.modifiedCount;
  }
}
