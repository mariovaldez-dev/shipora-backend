import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RateHistory } from '@modules/orders/entities/rate-history.entity';

export interface SaveRateQueryParams {
  userId: string;
  originZipCode: string;
  originCity: string;
  originState: string;
  originCountry: string;
  destinationZipCode: string;
  destinationCity: string;
  destinationState: string;
  destinationCountry: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  declaredValue: number;
  quotes: Array<{
    carrier: string;
    serviceType: string;
    price: number;
    estimatedDays: number;
    currency: string;
    rateId?: string;
  }>;
  requestDuration: number;
  masterRateId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class RateStorageService {
  private readonly logger = new Logger(RateStorageService.name);

  constructor(
    @InjectModel(RateHistory.name)
    private readonly rateHistoryModel: Model<RateHistory>,
  ) {}

  async saveRateQuery(params: SaveRateQueryParams): Promise<RateHistory> {
    this.logger.log(
      `Saving rate query with masterRateId: ${params.masterRateId}`,
    );

    const rateHistory = new this.rateHistoryModel({
      userId: new Types.ObjectId(params.userId),
      masterRateId: params.masterRateId,
      originCountry: params.originCountry,
      originCity: params.originCity,
      originState: params.originState,
      originZipCode: params.originZipCode,
      destinationCountry: params.destinationCountry,
      destinationCity: params.destinationCity,
      destinationState: params.destinationState,
      destinationZipCode: params.destinationZipCode,
      weight: params.weight,
      length: params.length,
      width: params.width,
      height: params.height,
      declaredValue: params.declaredValue,
      quotes: params.quotes,
      requestDuration: params.requestDuration,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const saved = await rateHistory.save();
    this.logger.log(`Rate query saved with ID: ${saved._id}`);
    return saved;
  }

  async findByMasterRateId(masterRateId: string): Promise<RateHistory | null> {
    return this.rateHistoryModel.findOne({ masterRateId }).exec();
  }

  async findByUserId(
    userId: string,
    limit = 100,
    skip = 0,
  ): Promise<RateHistory[]> {
    return this.rateHistoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }
}
