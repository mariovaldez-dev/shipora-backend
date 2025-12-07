import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RateHistory } from '../../entities/rate-history.entity';
import { IRateHistoryRepository } from '../../domain/repositories/rate-history.repository.interface';

@Injectable()
export class RateHistoryRepository implements IRateHistoryRepository {
  constructor(
    @InjectModel(RateHistory.name) private rateHistoryModel: Model<RateHistory>,
  ) {}

  async create(data: Partial<RateHistory>): Promise<RateHistory> {
    const doc = new this.rateHistoryModel(data);
    return await doc.save();
  }

  async findByUserId(
    userId: string,
    limit: number,
    skip: number,
  ): Promise<RateHistory[]> {
    return await this.rateHistoryModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async aggregateCarrierStats(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<any[]> {
    return await this.rateHistoryModel.aggregate([
      { $match: { userId: userId, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$selectedCarrier',
          count: { $sum: 1 },
          avgPrice: { $avg: '$selectedPrice' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async aggregateTopRoutes(userId: string, limit: number): Promise<any[]> {
    return await this.rateHistoryModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { origin: '$originCountry', destination: '$destinationCountry' },
          count: { $sum: 1 },
          avgPrice: { $avg: '$selectedPrice' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }
}
