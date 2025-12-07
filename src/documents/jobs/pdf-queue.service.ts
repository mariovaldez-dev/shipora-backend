/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { DocumentType } from '../entities/document-metadata.entity';
import { PdfDownloadJobData } from './pdf-download.processor';

@Injectable()
export class PdfQueueService {
  private readonly logger = new Logger(PdfQueueService.name);

  constructor(@InjectQueue('pdf-queue') private pdfQueue: Queue) {}

  /**
   * Enqueue a PDF download and storage job
   * Returns immediately without waiting for download
   */
  async enqueuePdfDownload(data: PdfDownloadJobData): Promise<string> {
    try {
      const job = await this.pdfQueue.add('download-and-store', data, {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: true, // Auto-remove successful jobs
        removeOnFail: false, // Keep failed jobs for debugging
      });

      this.logger.log(
        `PDF download job enqueued: Job ID ${String(job.id)} for shipment ${data.shipmentId}`,
      );
      return String(job.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue PDF download: ${errorMsg}`, error);
      throw new Error(`Failed to enqueue PDF download: ${errorMsg}`);
    }
  }

  /**
   * Get job status by ID
   */
  async getJobStatus(jobId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job: any = await this.pdfQueue.getJob(parseInt(jobId, 10));
      if (!job) {
        return { status: 'not-found', jobId };
      }

      const state = await job.getState();
      const progress = job.progress();
      const data = job.data;
      const result = job.returnvalue;

      return {
        status: state,
        progress,
        jobId: String(job.id),
        shipmentId: (data as PdfDownloadJobData).shipmentId,
        result,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get job status: ${errorMsg}`, error);
      throw new Error(`Failed to get job status: ${errorMsg}`);
    }
  }

  /**
   * Get all pending jobs
   */
  async getPendingJobs() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobs: any[] = await (this.pdfQueue as any).getWaiting();
      return jobs.map((job) => ({
        id: String(job.id),
        data: job.data,
        state: 'pending',
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get pending jobs: ${errorMsg}`, error);
      throw new Error(`Failed to get pending jobs: ${errorMsg}`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const queueAny = this.pdfQueue as any;
      const pending = await queueAny.getWaiting();
      const active = await queueAny.getActive();
      const completed = await queueAny.getCompleted();
      const failed = await queueAny.getFailed();

      return {
        pending: pending.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total:
          pending.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get queue stats: ${errorMsg}`, error);
      throw new Error(`Failed to get queue stats: ${errorMsg}`);
    }
  }
}
