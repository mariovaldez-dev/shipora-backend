import { Shipment } from '../../entities/shipment.entity';

export interface IShipmentRepository {
  create(data: Partial<Shipment>): Promise<Shipment>;
  findByShiporaId(shiporaId: string): Promise<Shipment | null>;
  findByOrderId(orderId: string): Promise<Shipment[]>;
}
