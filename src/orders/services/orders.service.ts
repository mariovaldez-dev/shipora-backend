import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SalesOrder,
  OrderStatus,
  OrderSource,
} from '../entities/sales-order.entity';
import { Shipment, ShipmentStatus } from '../entities/shipment.entity';
import { RateHistory, RateQuote } from '../entities/rate-history.entity';
import utils from '@modules/core/shared/utils';

export interface CreateSalesOrderDto {
  userId: string;
  userName: string;
  items: any[];
  shippingFrom: any;
  shippingTo: any;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    source: OrderSource;
    referer?: string;
  };
  notes?: string;
}

export interface CreateShipmentDto {
  orderId: string;
  orderNumber: string;
  userId: string;
  carrier: string;
  trackingNumber?: string;
  masterTrackingNumber?: string;
  labelUrl?: string;
  labelDocumentId?: string;
  cost: number;
  apiResponse?: any;
}

export interface RateQueryDto {
  userId: string;
  userName: string;
  originCountry: string;
  originCity?: string;
  destinationCountry: string;
  destinationCity?: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  declaredValue: number;
  quotes: RateQuote[];
  requestDuration: number;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(SalesOrder.name) private salesOrderModel: Model<SalesOrder>,
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel(RateHistory.name) private rateHistoryModel: Model<RateHistory>,
  ) {}

  /**
   * Crear una nueva orden de venta
   */
  async createSalesOrder(dto: CreateSalesOrderDto): Promise<SalesOrder> {
    const orderNumber = await this.generateOrderNumber();

    const totalValue = dto.items.reduce((sum, item) => sum + item.value, 0);

    const salesOrder = new this.salesOrderModel({
      orderNumber,
      userId: dto.userId,
      userName: dto.userName,
      status: OrderStatus.PENDING,
      metadata: dto.metadata,
      items: dto.items,
      shippingFrom: dto.shippingFrom,
      shippingTo: dto.shippingTo,
      totalValue,
      shipmentIds: [],
      notes: dto.notes,
      requestedAt: new Date(),
    });

    return await salesOrder.save();
  }

  /**
   * Obtener orden de venta por ID
   */
  async getSalesOrder(id: string): Promise<SalesOrder | null> {
    return await this.salesOrderModel.findById(id);
  }

  /**
   * Listar órdenes de un usuario
   */
  async getUserSalesOrders(
    userId: string,
    limit = 50,
    skip = 0,
  ): Promise<SalesOrder[]> {
    return await this.salesOrderModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Actualizar estado de orden
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    metadata?: Record<string, any>,
  ): Promise<SalesOrder | null> {
    const updateData: any = { status };

    if (status === OrderStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancelReason = metadata?.reason;
    }

    return await this.salesOrderModel.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });
  }

  /**
   * Crear un shipment
   */
  async createShipment(dto: CreateShipmentDto): Promise<Shipment> {
    const shiporaId = utils.generateShiporaId();

    const shipment = new this.shipmentModel({
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      userId: dto.userId,
      shiporaId,
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
      masterTrackingNumber: dto.masterTrackingNumber,
      status: ShipmentStatus.PENDING,
      labelUrl: dto.labelUrl,
      labelDocumentId: dto.labelDocumentId,
      cost: dto.cost,
      apiResponse: dto.apiResponse
        ? JSON.stringify(dto.apiResponse)
        : undefined,
      trackingEvents: [
        {
          timestamp: new Date(),
          status: ShipmentStatus.PENDING,
          description: 'Shipment created',
        },
      ],
    });

    const savedShipment = await shipment.save();

    // Agregar shipment ID a la orden
    await this.salesOrderModel.findByIdAndUpdate(
      dto.orderId,
      { $push: { shipmentIds: savedShipment._id.toString() } },
      { new: true },
    );

    return savedShipment;
  }

  /**
   * Obtener shipment por ID de Shipora
   */
  async getShipmentByShiporaId(shiporaId: string): Promise<Shipment | null> {
    return await this.shipmentModel.findOne({ shiporaId });
  }

  /**
   * Listar shipments de una orden
   */
  async getOrderShipments(orderId: string): Promise<Shipment[]> {
    return await this.shipmentModel.find({ orderId }).sort({ createdAt: -1 });
  }

  /**
   * Actualizar estado del shipment
   */
  async updateShipmentStatus(
    shiporaId: string,
    status: ShipmentStatus,
    description: string,
    location?: string,
  ): Promise<Shipment | null> {
    return await this.shipmentModel.findOneAndUpdate(
      { shiporaId },
      {
        status,
        $push: {
          trackingEvents: {
            timestamp: new Date(),
            status,
            description,
            location,
          },
        },
      },
      { new: true },
    );
  }

  /**
   * Guardar historial de consulta de tarifas
   */
  async recordRateQuery(dto: RateQueryDto): Promise<RateHistory> {
    const rateHistory = new this.rateHistoryModel({
      userId: dto.userId,
      userName: dto.userName,
      originCountry: dto.originCountry,
      originCity: dto.originCity,
      destinationCountry: dto.destinationCountry,
      destinationCity: dto.destinationCity,
      weight: dto.weight,
      length: dto.length,
      width: dto.width,
      height: dto.height,
      declaredValue: dto.declaredValue,
      quotes: dto.quotes,
      requestDuration: dto.requestDuration,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    return await rateHistory.save();
  }

  /**
   * Asignar rate history a una orden (cuando se selecciona una tarifa)
   */
  async assignRateToOrder(
    rateHistoryId: string,
    orderId: string,
  ): Promise<RateHistory | null> {
    return await this.rateHistoryModel.findByIdAndUpdate(
      rateHistoryId,
      {
        orderId,
        orderAssignedAt: new Date(),
      },
      { new: true },
    );
  }

  /**
   * Obtener historiales de tarifa de un usuario (para KPIs)
   */
  async getUserRateHistory(
    userId: string,
    limit = 100,
    skip = 0,
  ): Promise<RateHistory[]> {
    return await this.rateHistoryModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Obtener estadísticas de tarifa por corredor (carrier)
   */
  async getCarrierStatistics(userId: string, startDate: Date, endDate: Date) {
    return await this.rateHistoryModel.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$selectedCarrier',
          count: { $sum: 1 },
          avgPrice: { $avg: '$selectedPrice' },
          totalVolume: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Obtener rutas más consultadas (para KPIs)
   */
  async getTopRoutes(userId: string, limit = 10) {
    return await this.rateHistoryModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            origin: '$originCountry',
            destination: '$destinationCountry',
          },
          count: { $sum: 1 },
          avgPrice: { $avg: '$selectedPrice' },
          avgDays: { $avg: '$quotes.estimatedDays' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Generar número de orden único
   */
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const countToday = await this.salesOrderModel.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59, 999)),
      },
    });

    const orderNumber = `SHP-${dateStr}-${String(countToday + 1).padStart(5, '0')}`;
    return orderNumber;
  }
}
