import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../entities/notification.entity';

// ==================== Create Notification DTO ====================

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: {
    trackingNumber?: string;
    orderId?: string;
    guideId?: string;
    invoiceId?: string;
    url?: string;
    [key: string]: unknown;
  };

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

// ==================== Bulk Create DTO ====================

export class BulkCreateNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}

// ==================== Query DTO ====================

export class QueryNotificationsDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isArchived?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

// ==================== Mark Read DTO ====================

export class MarkNotificationsReadDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

// ==================== Update Preferences DTO ====================

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  mutedTypes?: NotificationType[];

  @IsOptional()
  @IsBoolean()
  trackingUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  systemAlerts?: boolean;
}
