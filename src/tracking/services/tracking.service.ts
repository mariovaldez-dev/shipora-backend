import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Tracking,
  TrackingStatus,
  TrackingStatusCategory,
  statusToCategory,
  statusLabels,
  TrackingEvent,
} from '../entities/tracking.entity';
import {
  CreateTrackingDto,
  AddTrackingEventDto,
  QueryTrackingDto,
  WebhookEventDto,
  UpdateNotificationSettingsDto,
  PublicTrackingResponseDto,
} from '../dto/tracking.dto';

// Carrier status mapping (example for common carriers)
const carrierStatusMapping: Record<string, Record<string, TrackingStatus>> = {
  paquete_express: {
    DOCUMENTADO: TrackingStatus.LABEL_GENERATED,
    EN_RUTA_RECOLECCION: TrackingStatus.PICKUP_IN_PROGRESS,
    RECOLECTADO: TrackingStatus.PICKED_UP,
    EN_TRANSITO: TrackingStatus.IN_TRANSIT,
    EN_CENTRO_DISTRIBUCION: TrackingStatus.ARRIVED_AT_DESTINATION_HUB,
    EN_REPARTO: TrackingStatus.OUT_FOR_DELIVERY,
    ENTREGADO: TrackingStatus.DELIVERED,
    DEVOLUCION: TrackingStatus.RETURNED_TO_SENDER,
  },
  fedex: {
    PU: TrackingStatus.PICKED_UP,
    IT: TrackingStatus.IN_TRANSIT,
    OD: TrackingStatus.OUT_FOR_DELIVERY,
    DL: TrackingStatus.DELIVERED,
    DE: TrackingStatus.EXCEPTION,
  },
  dhl: {
    PU: TrackingStatus.PICKED_UP,
    PL: TrackingStatus.IN_TRANSIT,
    WC: TrackingStatus.OUT_FOR_DELIVERY,
    OK: TrackingStatus.DELIVERED,
  },
  propio: {}, // Custom mapping for own fleet
};

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    @InjectModel(Tracking.name)
    private readonly trackingModel: Model<Tracking>,
  ) {}

  // ==================== Create ====================

  async create(
    organizationId: string,
    dto: CreateTrackingDto,
  ): Promise<Tracking> {
    const trackingNumber =
      dto.trackingNumber || this.generateTrackingNumber(organizationId);

    // Check for duplicate
    const existing = await this.trackingModel.findOne({ trackingNumber });
    if (existing) {
      throw new BadRequestException(
        `Tracking number ${trackingNumber} already exists`,
      );
    }

    const tracking = new this.trackingModel({
      organizationId,
      trackingNumber,
      carrierTrackingNumber: dto.carrierTrackingNumber,
      orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
      guideId: dto.guideId ? new Types.ObjectId(dto.guideId) : undefined,
      carrier: dto.carrier,
      carrierName: dto.carrierName || dto.carrier,
      serviceType: dto.serviceType,
      origin: {
        ...dto.origin,
        country: dto.origin.country || 'México',
      },
      destination: {
        ...dto.destination,
        country: dto.destination.country || 'México',
      },
      package: dto.package,
      currentStatus: TrackingStatus.CREATED,
      statusCategory: TrackingStatusCategory.PENDING,
      estimatedDeliveryDate: dto.estimatedDeliveryDate
        ? new Date(dto.estimatedDeliveryDate)
        : undefined,
      notifyBySms: dto.notifyBySms ?? false,
      notifyByEmail: dto.notifyByEmail ?? true,
      notificationEmails: dto.notificationEmails || [],
      notificationPhones: dto.notificationPhones || [],
      events: [
        {
          _id: new Types.ObjectId(),
          status: TrackingStatus.CREATED,
          description: 'Envío registrado en el sistema',
          timestamp: new Date(),
        },
      ],
    });

    const saved = await tracking.save();
    this.logger.log(
      `Created tracking ${trackingNumber} for org ${organizationId}`,
    );

    return saved;
  }

  // ==================== Find All ====================

  async findAll(
    organizationId: string,
    query: QueryTrackingDto,
  ): Promise<{
    trackings: Tracking[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      status,
      carrier,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const filter: Record<string, unknown> = { organizationId };

    if (status) {
      filter.currentStatus = status;
    }

    if (carrier) {
      filter.carrier = carrier;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(fromDate);
      }
      if (toDate) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(toDate);
      }
    }

    if (search) {
      filter.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { carrierTrackingNumber: { $regex: search, $options: 'i' } },
        { 'destination.name': { $regex: search, $options: 'i' } },
        { 'destination.city': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.trackingModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const trackings = await this.trackingModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { trackings, total, page, totalPages };
  }

  // ==================== Find One ====================

  async findByTrackingNumber(
    organizationId: string,
    trackingNumber: string,
  ): Promise<Tracking> {
    const tracking = await this.trackingModel.findOne({
      organizationId,
      trackingNumber,
    });

    if (!tracking) {
      throw new NotFoundException(`Tracking ${trackingNumber} not found`);
    }

    return tracking;
  }

  async findById(organizationId: string, id: string): Promise<Tracking> {
    const tracking = await this.trackingModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId,
    });

    if (!tracking) {
      throw new NotFoundException(`Tracking not found`);
    }

    return tracking;
  }

  // ==================== Public Tracking (No Auth) ====================

  async getPublicTracking(
    trackingNumber: string,
  ): Promise<PublicTrackingResponseDto> {
    const tracking = await this.trackingModel.findOne({ trackingNumber });

    if (!tracking) {
      throw new NotFoundException(
        `No se encontró el envío con número ${trackingNumber}`,
      );
    }

    // Return sanitized public data
    return {
      trackingNumber: tracking.trackingNumber,
      currentStatus: tracking.currentStatus,
      statusLabel: statusLabels[tracking.currentStatus],
      carrier: tracking.carrier,
      carrierName: tracking.carrierName || tracking.carrier,
      serviceType: tracking.serviceType,
      origin: {
        city: tracking.origin.city,
        state: tracking.origin.state,
        country: tracking.origin.country,
      },
      destination: {
        city: tracking.destination.city,
        state: tracking.destination.state,
        country: tracking.destination.country,
      },
      estimatedDeliveryDate: tracking.estimatedDeliveryDate?.toISOString(),
      actualDeliveryDate: tracking.actualDeliveryDate?.toISOString(),
      events: tracking.events.map((event) => ({
        status: event.status,
        statusLabel: statusLabels[event.status],
        description: event.description,
        timestamp: event.timestamp.toISOString(),
        location: event.location
          ? {
              city: event.location.city,
              state: event.location.state,
            }
          : undefined,
      })),
      signedBy: tracking.signedBy,
    };
  }

  // ==================== Add Event ====================

  async addEvent(
    organizationId: string,
    trackingNumber: string,
    dto: AddTrackingEventDto,
  ): Promise<Tracking> {
    const tracking = await this.findByTrackingNumber(
      organizationId,
      trackingNumber,
    );

    const event: TrackingEvent = {
      _id: new Types.ObjectId(),
      status: dto.status,
      description: dto.description,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      location: dto.location,
      carrierStatus: dto.carrierStatus,
      carrierDescription: dto.carrierDescription,
      signedBy: dto.signedBy,
      proofOfDelivery: dto.proofOfDelivery,
    } as TrackingEvent;

    tracking.events.push(event);

    // Update current status
    tracking.currentStatus = dto.status;
    tracking.statusCategory = statusToCategory[dto.status];

    // Handle delivery status
    if (
      dto.status === TrackingStatus.DELIVERED ||
      dto.status === TrackingStatus.DELIVERED_TO_NEIGHBOR ||
      dto.status === TrackingStatus.DELIVERED_TO_RECEPTION
    ) {
      tracking.actualDeliveryDate = event.timestamp;
      if (dto.signedBy) {
        tracking.signedBy = dto.signedBy;
      }
      if (dto.proofOfDelivery) {
        tracking.photoUrl = dto.proofOfDelivery;
      }
    }

    const updated = await tracking.save();
    this.logger.log(`Added event ${dto.status} to tracking ${trackingNumber}`);

    // TODO: Trigger notifications
    // await this.notificationService.sendTrackingUpdate(tracking, event);

    return updated;
  }

  // ==================== Webhook Handler ====================

  async handleWebhook(dto: WebhookEventDto): Promise<Tracking | null> {
    // Find tracking by carrier tracking number
    const tracking = await this.trackingModel.findOne({
      carrierTrackingNumber: dto.carrierTrackingNumber,
      carrier: dto.carrier,
    });

    if (!tracking) {
      this.logger.warn(
        `Webhook received for unknown tracking: ${dto.carrier}/${dto.carrierTrackingNumber}`,
      );
      return null;
    }

    // Map carrier status to internal status
    const mappedStatus = this.mapCarrierStatus(dto.carrier, dto.status);

    if (!mappedStatus) {
      this.logger.warn(`Unknown carrier status: ${dto.carrier}/${dto.status}`);
      return tracking;
    }

    // Add event
    const event: TrackingEvent = {
      _id: new Types.ObjectId(),
      status: mappedStatus,
      description: dto.description || statusLabels[mappedStatus],
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      location: dto.location,
      carrierStatus: dto.status,
      carrierDescription: dto.description,
      signedBy: dto.signedBy,
      proofOfDelivery: dto.proofOfDelivery,
      metadata: dto.rawPayload,
    } as TrackingEvent;

    tracking.events.push(event);
    tracking.currentStatus = mappedStatus;
    tracking.statusCategory = statusToCategory[mappedStatus];
    tracking.lastWebhookUpdate = new Date();
    tracking.webhookSource = dto.carrier;

    // Handle delivery
    if (
      mappedStatus === TrackingStatus.DELIVERED ||
      mappedStatus === TrackingStatus.DELIVERED_TO_NEIGHBOR ||
      mappedStatus === TrackingStatus.DELIVERED_TO_RECEPTION
    ) {
      tracking.actualDeliveryDate = event.timestamp;
      if (dto.signedBy) tracking.signedBy = dto.signedBy;
      if (dto.proofOfDelivery) tracking.photoUrl = dto.proofOfDelivery;
    }

    const updated = await tracking.save();
    this.logger.log(
      `Webhook updated tracking ${tracking.trackingNumber} to ${mappedStatus}`,
    );

    return updated;
  }

  // ==================== Update Notification Settings ====================

  async updateNotificationSettings(
    organizationId: string,
    trackingNumber: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<Tracking> {
    const tracking = await this.findByTrackingNumber(
      organizationId,
      trackingNumber,
    );

    if (dto.notifyBySms !== undefined) {
      tracking.notifyBySms = dto.notifyBySms;
    }
    if (dto.notifyByEmail !== undefined) {
      tracking.notifyByEmail = dto.notifyByEmail;
    }
    if (dto.notificationEmails) {
      tracking.notificationEmails = dto.notificationEmails;
    }
    if (dto.notificationPhones) {
      tracking.notificationPhones = dto.notificationPhones;
    }

    return tracking.save();
  }

  // ==================== Statistics ====================

  async getStats(organizationId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byCarrier: Record<string, number>;
    deliveredToday: number;
    inTransit: number;
    exceptions: number;
  }> {
    const [total, byStatusAgg, byCategoryAgg, byCarrierAgg, deliveredToday] =
      await Promise.all([
        this.trackingModel.countDocuments({ organizationId }),
        this.trackingModel.aggregate([
          { $match: { organizationId } },
          { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
        ]),
        this.trackingModel.aggregate([
          { $match: { organizationId } },
          { $group: { _id: '$statusCategory', count: { $sum: 1 } } },
        ]),
        this.trackingModel.aggregate([
          { $match: { organizationId } },
          { $group: { _id: '$carrier', count: { $sum: 1 } } },
        ]),
        this.trackingModel.countDocuments({
          organizationId,
          currentStatus: {
            $in: [
              TrackingStatus.DELIVERED,
              TrackingStatus.DELIVERED_TO_NEIGHBOR,
              TrackingStatus.DELIVERED_TO_RECEPTION,
            ],
          },
          actualDeliveryDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
      ]);

    const byStatus: Record<string, number> = {};
    byStatusAgg.forEach((item: { _id: string; count: number }) => {
      byStatus[item._id] = item.count;
    });

    const byCategory: Record<string, number> = {};
    byCategoryAgg.forEach((item: { _id: string; count: number }) => {
      if (item._id) byCategory[item._id] = item.count;
    });

    const byCarrier: Record<string, number> = {};
    byCarrierAgg.forEach((item: { _id: string; count: number }) => {
      byCarrier[item._id] = item.count;
    });

    return {
      total,
      byStatus,
      byCategory,
      byCarrier,
      deliveredToday,
      inTransit: byCategory[TrackingStatusCategory.IN_TRANSIT] || 0,
      exceptions: byCategory[TrackingStatusCategory.EXCEPTION] || 0,
    };
  }

  // ==================== Helpers ====================

  private generateTrackingNumber(organizationId: string): string {
    const prefix = 'SHP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private mapCarrierStatus(
    carrier: string,
    carrierStatus: string,
  ): TrackingStatus | null {
    const mapping = carrierStatusMapping[carrier.toLowerCase()];
    if (!mapping) return null;
    return mapping[carrierStatus] || null;
  }
}
