import { SalesOrder } from '../../entities/sales-order.entity';

export interface ISalesOrderRepository {
  create(data: Partial<SalesOrder>): Promise<SalesOrder>;
  findById(id: string): Promise<SalesOrder | null>;
  findByUserId(
    userId: string,
    limit: number,
    skip: number,
  ): Promise<SalesOrder[]>;
  update(id: string, data: Partial<SalesOrder>): Promise<SalesOrder | null>;
  pushShipmentId(orderId: string, shipmentId: string): Promise<void>;
  updateStatus(
    orderId: string,
    status: string,
    metadata?: Record<string, any>,
  ): Promise<SalesOrder | null>;
}
