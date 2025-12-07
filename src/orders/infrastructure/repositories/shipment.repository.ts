import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shipment } from '../../entities/shipment.entity';
import { IShipmentRepository } from '../../domain/repositories/shipment.repository.interface';

@Injectable()
export class ShipmentRepository implements IShipmentRepository {
  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
  ) {}

  async create(data: Partial<Shipment>): Promise<Shipment> {
    const doc = new this.shipmentModel(data);
    return await doc.save();
  }

  async findByShiporaId(shiporaId: string): Promise<Shipment | null> {
    return await this.shipmentModel.findOne({ shiporaId });
  }

  async findByOrderId(orderId: string): Promise<Shipment[]> {
    return await this.shipmentModel.find({ orderId }).sort({ createdAt: -1 });
  }
}
