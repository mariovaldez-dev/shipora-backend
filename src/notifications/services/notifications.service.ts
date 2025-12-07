import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  notificationMeta,
} from '../entities/notification.entity';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
  QueryNotificationsDto,
  MarkNotificationsReadDto,
} from '../dto/notification.dto';

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  // ==================== Create ====================

  async create(
    organizationId: string,
    dto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      organizationId,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      priority: dto.priority || NotificationPriority.MEDIUM,
      channels: dto.channels || [NotificationChannel.IN_APP],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    const saved = await notification.save();
    this.logger.log(`Created notification ${saved._id} for user ${dto.userId}`);

    // TODO: Send to other channels (email, sms, push)
    // await this.sendToChannels(saved);

    return saved;
  }

  async createBulk(
    organizationId: string,
    dto: BulkCreateNotificationDto,
  ): Promise<{ created: number }> {
    const notifications = dto.userIds.map((userId) => ({
      organizationId,
      userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      priority: dto.priority || NotificationPriority.MEDIUM,
      channels: dto.channels || [NotificationChannel.IN_APP],
    }));

    const result = await this.notificationModel.insertMany(notifications);
    this.logger.log(
      `Created ${result.length} notifications for ${dto.userIds.length} users`,
    );

    return { created: result.length };
  }

  // ==================== Helper to create common notifications ====================

  async notifyTrackingUpdate(
    organizationId: string,
    userId: string,
    trackingNumber: string,
    status: string,
    message: string,
  ): Promise<Notification> {
    return this.create(organizationId, {
      userId,
      type: NotificationType.TRACKING_UPDATE,
      title: `Actualización: ${trackingNumber}`,
      message,
      data: { trackingNumber, status },
      priority: NotificationPriority.MEDIUM,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    });
  }

  async notifyDelivered(
    organizationId: string,
    userId: string,
    trackingNumber: string,
    signedBy?: string,
  ): Promise<Notification> {
    const message = signedBy
      ? `Tu paquete fue entregado. Recibió: ${signedBy}`
      : 'Tu paquete ha sido entregado exitosamente';

    return this.create(organizationId, {
      userId,
      type: NotificationType.DELIVERED,
      title: '¡Paquete entregado!',
      message,
      data: { trackingNumber, signedBy },
      priority: NotificationPriority.HIGH,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
      ],
    });
  }

  async notifyException(
    organizationId: string,
    userId: string,
    trackingNumber: string,
    reason: string,
  ): Promise<Notification> {
    return this.create(organizationId, {
      userId,
      type: NotificationType.EXCEPTION,
      title: 'Problema con tu envío',
      message: `Hay un problema con el envío ${trackingNumber}: ${reason}`,
      data: { trackingNumber, reason },
      priority: NotificationPriority.URGENT,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ],
    });
  }

  async notifyOrderCreated(
    organizationId: string,
    userId: string,
    orderId: string,
    orderNumber: string,
  ): Promise<Notification> {
    return this.create(organizationId, {
      userId,
      type: NotificationType.ORDER_CREATED,
      title: 'Nueva orden creada',
      message: `Tu orden ${orderNumber} ha sido creada exitosamente`,
      data: { orderId, orderNumber, url: `/orders/${orderId}` },
      priority: NotificationPriority.LOW,
    });
  }

  async notifyLabelReady(
    organizationId: string,
    userId: string,
    guideId: string,
    trackingNumber: string,
  ): Promise<Notification> {
    return this.create(organizationId, {
      userId,
      type: NotificationType.LABEL_READY,
      title: 'Etiqueta lista para imprimir',
      message: `La etiqueta para el envío ${trackingNumber} está lista`,
      data: { guideId, trackingNumber, url: `/guides/${guideId}` },
      priority: NotificationPriority.MEDIUM,
    });
  }

  // ==================== Find ====================

  async findAll(
    organizationId: string,
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      isRead,
      isArchived = false,
      type,
      priority,
      page = 1,
      limit = 20,
    } = query;

    const filter: Record<string, unknown> = {
      organizationId,
      userId,
      isArchived,
    };

    if (isRead !== undefined) {
      filter.isRead = isRead;
    }

    if (type) {
      filter.type = type;
    }

    if (priority) {
      filter.priority = priority;
    }

    const total = await this.notificationModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const notifications = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { notifications, total, page, totalPages };
  }

  async findById(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<Notification> {
    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(id),
      organizationId,
      userId,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getUnreadCount(
    organizationId: string,
    userId: string,
  ): Promise<number> {
    return this.notificationModel.countDocuments({
      organizationId,
      userId,
      isRead: false,
      isArchived: false,
    });
  }

  async getStats(
    organizationId: string,
    userId: string,
  ): Promise<NotificationStats> {
    const [total, unread, byTypeAgg, byPriorityAgg] = await Promise.all([
      this.notificationModel.countDocuments({
        organizationId,
        userId,
        isArchived: false,
      }),
      this.notificationModel.countDocuments({
        organizationId,
        userId,
        isRead: false,
        isArchived: false,
      }),
      this.notificationModel.aggregate([
        { $match: { organizationId, userId, isArchived: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.notificationModel.aggregate([
        { $match: { organizationId, userId, isArchived: false } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
    ]);

    const byType: Record<string, number> = {};
    byTypeAgg.forEach((item: { _id: string; count: number }) => {
      byType[item._id] = item.count;
    });

    const byPriority: Record<string, number> = {};
    byPriorityAgg.forEach((item: { _id: string; count: number }) => {
      byPriority[item._id] = item.count;
    });

    return { total, unread, byType, byPriority };
  }

  // ==================== Update ====================

  async markAsRead(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<Notification> {
    const notification = await this.findById(organizationId, userId, id);

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  async markManyAsRead(
    organizationId: string,
    userId: string,
    dto: MarkNotificationsReadDto,
  ): Promise<{ updated: number }> {
    const result = await this.notificationModel.updateMany(
      {
        _id: { $in: dto.notificationIds.map((id) => new Types.ObjectId(id)) },
        organizationId,
        userId,
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: new Date() },
      },
    );

    return { updated: result.modifiedCount };
  }

  async markAllAsRead(
    organizationId: string,
    userId: string,
  ): Promise<{ updated: number }> {
    const result = await this.notificationModel.updateMany(
      {
        organizationId,
        userId,
        isRead: false,
        isArchived: false,
      },
      {
        $set: { isRead: true, readAt: new Date() },
      },
    );

    return { updated: result.modifiedCount };
  }

  async archive(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<Notification> {
    const notification = await this.findById(organizationId, userId, id);

    notification.isArchived = true;
    notification.archivedAt = new Date();
    await notification.save();

    return notification;
  }

  // ==================== Delete ====================

  async delete(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(id),
      organizationId,
      userId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async deleteAllArchived(
    organizationId: string,
    userId: string,
  ): Promise<{ deleted: number }> {
    const result = await this.notificationModel.deleteMany({
      organizationId,
      userId,
      isArchived: true,
    });

    return { deleted: result.deletedCount };
  }
}
