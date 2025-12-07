import { Injectable, Inject } from '@nestjs/common';
import {
  SHIPMENT_REPOSITORY,
  SALES_ORDER_REPOSITORY,
} from '../../domain/repositories/constants';
import type { IShipmentRepository } from '../../domain/repositories/shipment.repository.interface';
import type { ISalesOrderRepository } from '../../domain/repositories/sales-order.repository.interface';
import type { CreateShipmentDto } from '../dto';
import { Types } from 'mongoose';

@Injectable()
export class CreateShipmentUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipmentRepository: IShipmentRepository,
    @Inject(SALES_ORDER_REPOSITORY)
    private readonly salesOrderRepository: ISalesOrderRepository,
  ) {}

  async execute(dto: CreateShipmentDto) {
    // Validar que la orden existe
    const order = await this.salesOrderRepository.findById(dto.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Generar shiporaId único
    const shiporaId = `SH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Crear el shipment con el shiporaId generado y convertir IDs
    const shipment = await this.shipmentRepository.create({
      ...dto,
      shiporaId,
      orderId: new Types.ObjectId(dto.orderId),
      userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
    });

    // Relacionar el shipment con la orden de venta
    await this.salesOrderRepository.pushShipmentId(
      dto.orderId,
      shipment._id.toString(),
    );
    return shipment;
  }
}
