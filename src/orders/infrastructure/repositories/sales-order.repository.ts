import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesOrder } from '../../entities/sales-order.entity';
import { ISalesOrderRepository } from '../../domain/repositories/sales-order.repository.interface';

@Injectable()
export class SalesOrderRepository implements ISalesOrderRepository {
  constructor(
    @InjectModel(SalesOrder.name) private salesOrderModel: Model<SalesOrder>,
  ) {}

  async create(data: Partial<SalesOrder>): Promise<SalesOrder> {
    const doc = new this.salesOrderModel(data);
    return await doc.save();
  }

  async findById(id: string): Promise<SalesOrder | null> {
    return await this.salesOrderModel.findById(id);
  }

  async findByUserId(
    userId: string,
    limit: number,
    skip: number,
  ): Promise<SalesOrder[]> {
    return await this.salesOrderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async update(
    id: string,
    data: Partial<SalesOrder>,
  ): Promise<SalesOrder | null> {
    return await this.salesOrderModel.findByIdAndUpdate(id, data, {
      new: true,
    });
  }

  async pushShipmentId(orderId: string, shipmentId: string): Promise<void> {
    await this.salesOrderModel.findByIdAndUpdate(orderId, {
      $push: { shipmentIds: shipmentId },
    });
  }

  async updateStatus(
    orderId: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<SalesOrder | null> {
    const updateData: any = { status };
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = metadata?.reason;
    }
    return await this.salesOrderModel.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });
  }
}
