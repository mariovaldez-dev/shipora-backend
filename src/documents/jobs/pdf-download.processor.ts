import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import axios from 'axios';
import { DocumentService } from '../services/document.service';
import { DocumentType } from '../entities/document-metadata.entity';

export interface PdfDownloadJobData {
  pdfUrl: string;
  shipmentId: string;
  fileName: string;
  docType: DocumentType;
}

@Processor('pdf-queue')
@Injectable()
export class PdfDownloadProcessor {
  private readonly logger = new Logger(PdfDownloadProcessor.name);

  constructor(private documentService: DocumentService) {}

  /**
   * Process job: Download PDF from URL and store in GridFS
   */
  @Process('download-and-store')
  async handlePdfDownload(job: Job<PdfDownloadJobData>) {
    const { pdfUrl, shipmentId, fileName, docType } = job.data;
    this.logger.log(
      `[Job ${String(job.id)}] Starting PDF download from: ${pdfUrl}`,
    );

    try {
      // 1. Download PDF from carrier URL
      this.logger.log(`[Job ${String(job.id)}] Downloading PDF...`);
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
      });

      if (!response.data) {
        throw new Error('PDF download returned empty buffer');
      }

      const pdfBuffer = Buffer.from(response.data as ArrayBuffer);
      this.logger.log(
        `[Job ${String(job.id)}] Downloaded PDF successfully: ${pdfBuffer.length} bytes`,
      );

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Downloaded PDF buffer is empty');
      }

      // 2. Save to GridFS via DocumentService
      this.logger.log(`[Job ${String(job.id)}] Saving PDF to GridFS...`);
      const savedDoc = await this.documentService.saveDocument({
        shipmentId,
        type: docType,
        buffer: pdfBuffer,
        fileName,
        fileSizeBytes: pdfBuffer.length,
        mimeType: 'application/pdf',
      });

      this.logger.log(
        `[Job ${String(job.id)}] PDF saved successfully to GridFS with ID: ${String(savedDoc._id)}`,
      );

      // Return metadata so caller can see success
      return {
        success: true,
        documentId: savedDoc._id,
        fileName: savedDoc.fileName,
        storagePath: savedDoc.storagePath,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Job ${String(job.id)}] Failed to download/store PDF: ${errorMsg}`,
        error instanceof Error ? error.stack : '',
      );

      // Re-throw so Bull marks job as failed and can retry
      const msg = `PDF download/store failed for ${fileName}: ${errorMsg}`;
      throw new Error(msg);
    }
  }
}
