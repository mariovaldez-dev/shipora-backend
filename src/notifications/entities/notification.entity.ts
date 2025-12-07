import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Notification types
export enum NotificationType {
  // Tracking notifications
  TRACKING_UPDATE = 'tracking_update',
  DELIVERY_ATTEMPTED = 'delivery_attempted',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',

  // Order notifications
  ORDER_CREATED = 'order_created',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_CANCELLED = 'order_cancelled',
  LABEL_READY = 'label_ready',

  // Payment notifications
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  INVOICE_GENERATED = 'invoice_generated',

  // System notifications
  SYSTEM_ALERT = 'system_alert',
  MAINTENANCE = 'maintenance',
  NEW_FEATURE = 'new_feature',

  // Coverage notifications
  COVERAGE_UPDATE = 'coverage_update',
  RATE_CHANGE = 'rate_change',

  // User notifications
  WELCOME = 'welcome',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_UPDATED = 'account_updated',
}

// Notification priority
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Notification channel
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

// Type to icon/color mapping for frontend
export const notificationMeta: Record<
  NotificationType,
  { icon: string; color: string; title: string }
> = {
  [NotificationType.TRACKING_UPDATE]: {
    icon: 'truck',
    color: 'blue',
    title: 'Actualización de envío',
  },
  [NotificationType.DELIVERY_ATTEMPTED]: {
    icon: 'clock',
    color: 'yellow',
    title: 'Intento de entrega',
  },
  [NotificationType.DELIVERED]: {
    icon: 'check-circle',
    color: 'green',
    title: 'Paquete entregado',
  },
  [NotificationType.EXCEPTION]: {
    icon: 'alert-triangle',
    color: 'red',
    title: 'Problema con envío',
  },
  [NotificationType.ORDER_CREATED]: {
    icon: 'shopping-cart',
    color: 'blue',
    title: 'Nueva orden',
  },
  [NotificationType.ORDER_CONFIRMED]: {
    icon: 'check',
    color: 'green',
    title: 'Orden confirmada',
  },
  [NotificationType.ORDER_CANCELLED]: {
    icon: 'x-circle',
    color: 'red',
    title: 'Orden cancelada',
  },
  [NotificationType.LABEL_READY]: {
    icon: 'file-text',
    color: 'green',
    title: 'Etiqueta lista',
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    icon: 'dollar-sign',
    color: 'green',
    title: 'Pago recibido',
  },
  [NotificationType.PAYMENT_FAILED]: {
    icon: 'credit-card',
    color: 'red',
    title: 'Pago fallido',
  },
  [NotificationType.INVOICE_GENERATED]: {
    icon: 'file',
    color: 'blue',
    title: 'Factura generada',
  },
  [NotificationType.SYSTEM_ALERT]: {
    icon: 'bell',
    color: 'yellow',
    title: 'Alerta del sistema',
  },
  [NotificationType.MAINTENANCE]: {
    icon: 'tool',
    color: 'orange',
    title: 'Mantenimiento',
  },
  [NotificationType.NEW_FEATURE]: {
    icon: 'star',
    color: 'purple',
    title: 'Nueva función',
  },
  [NotificationType.COVERAGE_UPDATE]: {
    icon: 'map',
    color: 'blue',
    title: 'Actualización de cobertura',
  },
  [NotificationType.RATE_CHANGE]: {
    icon: 'trending-up',
    color: 'yellow',
    title: 'Cambio de tarifas',
  },
  [NotificationType.WELCOME]: {
    icon: 'user-plus',
    color: 'green',
    title: 'Bienvenido',
  },
  [NotificationType.PASSWORD_CHANGED]: {
    icon: 'lock',
    color: 'blue',
    title: 'Contraseña actualizada',
  },
  [NotificationType.ACCOUNT_UPDATED]: {
    icon: 'user',
    color: 'blue',
    title: 'Cuenta actualizada',
  },
};

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends Document {
  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  data?: {
    trackingNumber?: string;
    orderId?: string;
    guideId?: string;
    invoiceId?: string;
    url?: string;
    [key: string]: unknown;
  };

  @Prop({ enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  priority: NotificationPriority;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.IN_APP],
  })
  channels: NotificationChannel[];

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: Date })
  archivedAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;

  // Email status
  @Prop({ default: false })
  emailSent: boolean;

  @Prop({ type: Date })
  emailSentAt?: Date;

  // SMS status
  @Prop({ default: false })
  smsSent: boolean;

  @Prop({ type: Date })
  smsSentAt?: Date;

  // Push status
  @Prop({ default: false })
  pushSent: boolean;

  @Prop({ type: Date })
  pushSentAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isArchived: 1, createdAt: -1 });
NotificationSchema.index({ organizationId: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
