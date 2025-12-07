import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EncryptionService } from './encryption.service';
import { Inject } from '@nestjs/common';
import type { IStorageService } from '../../storage/providers/gridfs-storage.service';
import {
  DocumentMetadata,
  DocumentType,
  StorageProvider,
  DocumentStatus,
  AccessLog,
} from '../entities/document-metadata.entity';

export interface SaveDocumentOptions {
  shipmentId: string;
  type: DocumentType;
  buffer: Buffer;
  fileName: string;
  fileSizeBytes: number;
  mimeType?: string;
  expiresAt?: Date;
}

export interface RetrieveDocumentOptions {
  documentId: string;
  accessLog?: AccessLog;
}

@Injectable()
export class DocumentService {
  constructor(
    private encryptionService: EncryptionService,
    @Inject('STORAGE_SERVICE') private storageService: IStorageService,
    @InjectModel(DocumentMetadata.name)
    private documentModel: Model<DocumentMetadata>,
  ) {}

  /**
   * Save a document with encryption and storage
   */
  async saveDocument(options: SaveDocumentOptions): Promise<DocumentMetadata> {
    try {
      // 1. Encrypt the PDF
      const encryptedData = this.encryptionService.encrypt(options.buffer);

      // 2. Create storage path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storageKey = `documents/${options.shipmentId}/${options.type}/${timestamp}/${options.fileName}.enc`;

      // 3. Convert encrypted ciphertext hex back to Buffer for storage
      const encryptedBuffer = Buffer.from(encryptedData.ciphertext, 'hex');

      // 4. Upload ENCRYPTED buffer to storage
      const { path: storagePath, url: storageUrl } =
        await this.storageService.upload({
          key: storageKey,
          buffer: encryptedBuffer, // Upload ENCRYPTED buffer
          metadata: {
            shipmentId: options.shipmentId,
            documentType: options.type,
            fileName: options.fileName,
            encrypted: 'true',
            algorithm: 'AES-256-GCM',
            uploadedAt: new Date().toISOString(),
          },
        });

      // 5. Save metadata to database
      const provider = storagePath.startsWith('gridfs://')
        ? StorageProvider.GRIDFS
        : StorageProvider.FIREBASE;

      const documentMetadata = new this.documentModel({
        shipmentId: options.shipmentId,
        type: options.type,
        storageProvider: provider,
        storagePath,
        storageUrl,
        encryptionAlgorithm: 'AES-256-GCM',
        encryptionIv: encryptedData.iv,
        encryptionAuthTag: encryptedData.authTag,
        fileName: options.fileName,
        fileSizeBytes: options.fileSizeBytes,
        mimeType: options.mimeType || 'application/pdf',
        expiresAt: options.expiresAt,
        status: DocumentStatus.STORED,
        accessLogs: [],
      });

      return await documentMetadata.save();
    } catch (error) {
      throw new BadRequestException(
        `Failed to save document: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve and decrypt a document
   */
  async getDocument(options: RetrieveDocumentOptions): Promise<Buffer> {
    try {
      // 1. Get metadata from database
      const metadata = await this.documentModel.findById(options.documentId);
      if (!metadata) {
        throw new BadRequestException('Document not found');
      }

      // 2. Check if document has expired
      if (metadata.expiresAt && new Date() > new Date(metadata.expiresAt)) {
        metadata.status = DocumentStatus.EXPIRED;
        await metadata.save();
        throw new BadRequestException('Document has expired');
      }

      // 3. Download from storage
      let storageRef = metadata.storagePath;
      if (storageRef.startsWith('gs://')) {
        storageRef = storageRef.replace('gs://', '').replace(/^[^/]+\//, '');
      }
      const encryptedBuffer = await this.storageService.download(storageRef);

      if (!encryptedBuffer || encryptedBuffer.length === 0) {
        throw new Error('Downloaded buffer is empty');
      }

      // 4. Decrypt
      const decrypted = this.encryptionService.decrypt({
        iv: metadata.encryptionIv,
        authTag: metadata.encryptionAuthTag,
        ciphertext: encryptedBuffer.toString('hex'),
      });

      // 5. Update access logs
      metadata.downloadCount = (metadata.downloadCount || 0) + 1;
      if (options.accessLog) {
        metadata.accessLogs.push(options.accessLog);
      }
      metadata.downloadedAt = new Date();
      await metadata.save();

      return decrypted;
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve document: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get document metadata without downloading
   */
  async getDocumentMetadata(documentId: string): Promise<DocumentMetadata> {
    const metadata = await this.documentModel.findById(documentId);
    if (!metadata) {
      throw new BadRequestException('Document not found');
    }
    return metadata;
  }

  /**
   * Get signed URL for direct access (Firebase only)
   */
  async getSignedUrl(documentId: string, expiresInHours = 1): Promise<string> {
    const metadata = await this.documentModel.findById(documentId);
    if (!metadata) {
      throw new BadRequestException('Document not found');
    }

    let storageRef = metadata.storagePath;
    if (storageRef.startsWith('gs://')) {
      storageRef = storageRef.replace('gs://', '').replace(/^[^/]+\//, '');
    }
    return await this.storageService.getSignedUrl(storageRef, expiresInHours);
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const metadata = await this.documentModel.findById(documentId);
    if (!metadata) {
      throw new BadRequestException('Document not found');
    }

    // Delete from storage
    let storageRef = metadata.storagePath;
    if (storageRef.startsWith('gs://')) {
      storageRef = storageRef.replace('gs://', '').replace(/^[^/]+\//, '');
    }
    await this.storageService.delete(storageRef);

    // Mark as deleted in database
    metadata.status = DocumentStatus.DELETED;
    await metadata.save();
  }

  /**
   * Get all documents for a shipment
   */
  async getShipmentDocuments(shipmentId: string): Promise<DocumentMetadata[]> {
    return await this.documentModel.find({
      shipmentId,
      status: { $ne: DocumentStatus.DELETED },
    });
  }

  /**
   * Get document by tracking number or master ID
   * Searches for LABEL type documents (typically used for PDFs)
   */
  async getDocumentByTracking(
    trackingNumberOrMasterId: string,
  ): Promise<DocumentMetadata | null> {
    // Try to find document where shipmentId matches tracking/masterId
    const metadata = await this.documentModel.findOne({
      shipmentId: trackingNumberOrMasterId,
      type: DocumentType.LABEL,
      status: { $ne: DocumentStatus.DELETED },
    });

    return metadata || null;
  }

  /**
   * Get all LABEL documents for a shipment (for batch retrieval)
   */
  async getShipmentLabels(shipmentId: string): Promise<DocumentMetadata[]> {
    return await this.documentModel.find({
      shipmentId,
      type: DocumentType.LABEL,
      status: { $ne: DocumentStatus.DELETED },
    });
  }

  /**
   * Clean up expired documents
   */
  async cleanupExpiredDocuments(): Promise<number> {
    const result = await this.documentModel.updateMany(
      {
        expiresAt: { $lt: new Date() },
        status: { $ne: DocumentStatus.DELETED },
      },
      {
        $set: { status: DocumentStatus.EXPIRED },
      },
    );
    return result.modifiedCount;
  }
}
