/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  BadRequestException,
  Res,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { DocumentService } from '../../services/document.service';
import {
  DocumentMetadata,
  DocumentType,
} from '../../entities/document-metadata.entity';

export interface UploadDocumentDto {
  shipmentId: string;
  type: DocumentType;
  fileName: string;
  expiresAt?: Date;
}

export interface DownloadDocumentDto {
  documentId: string;
}

@Controller('documents')
//@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentService: DocumentService) {}

  /**
   * Upload a new document (PDF)
   * Body: binary PDF file
   * Query: shipmentId, type (LABEL|INVOICE|PROOF|RECEIPT|CUSTOMS), fileName
   */
  @Post('upload')
  async uploadDocument(
    @Body() buffer: Buffer,
    @Query('shipmentId') shipmentId: string,
    @Query('type') type: DocumentType,
    @Query('fileName') fileName: string,
    @Query('expiresAt') expiresAt?: string,
  ): Promise<DocumentMetadata> {
    if (!shipmentId || !type || !fileName) {
      throw new BadRequestException(
        'Missing required query parameters: shipmentId, type, fileName',
      );
    }

    if (!Object.values(DocumentType).includes(type)) {
      throw new BadRequestException(
        `Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`,
      );
    }

    return this.documentService.saveDocument({
      shipmentId,
      type,
      buffer,
      fileName,
      fileSizeBytes: buffer.length,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });
  }

  /**
   * Download a document (returns decrypted PDF)
   */
  @Get(':documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ): Promise<void> {
    const buffer = await this.documentService.getDocument({
      documentId,
      accessLog: {
        ip: '127.0.0.1', // In production, get from request
        userAgent: 'unknown', // In production, get from request headers
        timestamp: new Date(),
      },
    });

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': 'attachment; filename="document.pdf"',
    });

    response.send(buffer);
  }

  /**
   * Get document metadata
   */
  @Get(':documentId/metadata')
  async getDocumentMetadata(
    @Param('documentId') documentId: string,
  ): Promise<DocumentMetadata> {
    return this.documentService.getDocumentMetadata(documentId);
  }

  /**
   * Get signed URL for direct access (without downloading through API)
   * Useful for large files or streaming
   */
  @Get(':documentId/signed-url')
  async getSignedUrl(
    @Param('documentId') documentId: string,
    @Query('expiresInHours') expiresInHours?: string,
  ): Promise<{ signedUrl: string; expiresAt: Date }> {
    const hours = expiresInHours ? parseInt(expiresInHours, 10) : 1;
    const signedUrl = await this.documentService.getSignedUrl(
      documentId,
      hours,
    );

    return {
      signedUrl,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    };
  }

  /**
   * Get all documents for a shipment
   */
  @Get('shipment/:shipmentId')
  async getShipmentDocuments(
    @Param('shipmentId') shipmentId: string,
  ): Promise<DocumentMetadata[]> {
    return this.documentService.getShipmentDocuments(shipmentId);
  }

  /**
   * Get document by tracking number or master ID
   * Useful after shipment creation to retrieve the PDF
   * Returns document metadata and download URL
   */
  @Get('tracking/:trackingOrMasterId')
  async getDocumentByTracking(
    @Param('trackingOrMasterId') trackingOrMasterId: string,
  ): Promise<{
    document: DocumentMetadata | null;
    downloadUrl: string | null;
  }> {
    const document =
      await this.documentService.getDocumentByTracking(trackingOrMasterId);

    if (!document) {
      return {
        document: null,
        downloadUrl: null,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documentId = (document as any)?._id?.toString() || null;
    return {
      document,
      downloadUrl: documentId ? `/documents/${documentId}/download` : null,
    };
  }

  /**
   * Download document directly by tracking number
   * Returns the PDF file for download
   */
  @Get('tracking/:trackingOrMasterId/download')
  async downloadDocumentByTracking(
    @Param('trackingOrMasterId') trackingOrMasterId: string,
    @Res() response: Response,
  ): Promise<void> {
    const metadata =
      await this.documentService.getDocumentByTracking(trackingOrMasterId);

    if (!metadata) {
      response.status(404).json({
        error: 'Document not found for tracking number',
        tracking: trackingOrMasterId,
      });
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docId = (metadata as any)?._id?.toString() || '';
      const buffer = await this.documentService.getDocument({
        documentId: docId,
        accessLog: {
          ip: '127.0.0.1',
          userAgent: 'unknown',
          timestamp: new Date(),
        },
      });

      response.set({
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length,
        'Content-Disposition': `attachment; filename="${metadata.fileName}"`,
      });

      response.send(buffer);
    } catch (error) {
      response.status(500).json({
        error: 'Failed to download document',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get all label documents for a shipment
   */
  @Get('labels/:shipmentId')
  async getShipmentLabels(
    @Param('shipmentId') shipmentId: string,
  ): Promise<DocumentMetadata[]> {
    return this.documentService.getShipmentLabels(shipmentId);
  }

  /**
   * Delete a document
   */
  @Delete(':documentId')
  async deleteDocument(@Param('documentId') documentId: string): Promise<void> {
    await this.documentService.deleteDocument(documentId);
  }
}
