import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export enum DocumentType {
  LABEL = 'LABEL',
  INVOICE = 'INVOICE',
  PROOF = 'PROOF',
  RECEIPT = 'RECEIPT',
  CUSTOMS = 'CUSTOMS',
}

export enum StorageProvider {
  FIREBASE = 'FIREBASE',
  S3 = 'S3',
  GRIDFS = 'GRIDFS',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  STORED = 'STORED',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED',
}

export interface AccessLog {
  ip: string;
  userAgent: string;
  timestamp: Date;
  userId?: string;
}

@Schema({ timestamps: true })
export class DocumentMetadata extends MongooseDocument {
  @Prop({ type: Types.ObjectId, required: true })
  shipmentId: string;

  @Prop({
    type: String,
    enum: Object.values(DocumentType),
    required: true,
  })
  type: DocumentType;

  @Prop({
    type: String,
    enum: Object.values(StorageProvider),
    required: true,
  })
  storageProvider: StorageProvider;

  @Prop({ required: true })
  storagePath: string; // s3://bucket/path/file.pdf.enc or gs://bucket/path/file.pdf.enc

  @Prop({ nullable: true })
  storageUrl: string; // Signed URL (temporary)

  @Prop({ default: 'AES-256-GCM', required: true })
  encryptionAlgorithm: string;

  @Prop({ required: true })
  encryptionIv: string; // hex encoded

  @Prop({ required: true })
  encryptionAuthTag: string; // hex encoded

  @Prop()
  fileName: string;

  @Prop()
  fileSizeBytes: number;

  @Prop({ default: 'application/pdf' })
  mimeType: string;

  @Prop({ type: Date })
  expiresAt: Date;

  @Prop({ type: Date, nullable: true })
  downloadedAt: Date;

  @Prop({ type: Number, default: 0 })
  downloadCount: number;

  @Prop({ type: Array, default: [] })
  accessLogs: AccessLog[];

  @Prop({
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Prop({ index: true, default: () => new Date() })
  createdAt: Date;

  @Prop({ index: true })
  updatedAt: Date;
}

export const DocumentMetadataSchema =
  SchemaFactory.createForClass(DocumentMetadata);

// Crear índices
DocumentMetadataSchema.index({ shipmentId: 1 });
DocumentMetadataSchema.index({ type: 1 });
DocumentMetadataSchema.index({ expiresAt: 1 });
DocumentMetadataSchema.index({ storageProvider: 1 });
DocumentMetadataSchema.index({ status: 1 });
DocumentMetadataSchema.index({ createdAt: 1 });
