# PDF Queue System Setup Guide

## Overview

The async PDF download queue system allows shipments to be created immediately while PDF downloads happen in the background. This prevents blocking shipment creation on slow carrier PDF generation or network issues.

## Architecture

```
User Request (Create Shipment)
    ↓
Carrier Creates Label (Paquete Express API)
    ↓
Extract PDF URL + Shipment Details
    ↓
Enqueue PDF Download Job (Bull Queue)
    ↓
Return Shipment Info Immediately
    ↓
Background Job Processor Downloads PDF
    ↓
Encrypt & Store in GridFS
```

## Components

### 1. **PdfQueueService** (`src/documents/jobs/pdf-queue.service.ts`)

Public API for enqueuing and monitoring PDF jobs.

**Key Methods:**

- `enqueuePdfDownload(data)` - Enqueue a job
  - Returns job ID for status tracking
  - Configured with 3 retries and exponential backoff (2s initial delay)
- `getJobStatus(jobId)` - Get job status
  - Returns: `{ state, progress, result, failedReason }`
- `getPendingJobs()` - List all jobs waiting to be processed
- `getQueueStats()` - Get queue statistics
  - Returns: `{ waiting, active, completed, failed }`

### 2. **PdfDownloadProcessor** (`src/documents/jobs/pdf-download.processor.ts`)

Bull job processor that handles PDF downloads.

**Responsibilities:**

- Downloads PDF from carrier URL (30-second timeout)
- Validates PDF buffer
- Encrypts PDF with AES-256-GCM
- Stores in GridFS via DocumentService
- Handles errors and retries automatically

### 3. **Integration Point**

**PaqueteExpressCarrier.createShipment()**

```typescript
// OLD: Blocking PDF download
const label = await downloadAndStoreLabel(pdfUrl);

// NEW: Async queue enqueue
if (pdfUrl) {
  await this.pdfQueueService.enqueuePdfDownload({
    pdfUrl,
    shipmentId: masterId,
    fileName: `paquete-express-${masterId}.pdf`,
    docType: DocumentType.LABEL,
  });
}

// Return immediately
return [
  {
    masterTrackingNumber: masterId,
    trackingNumber: trackingId,
    labelUrl: 'queued-for-storage', // Indicates PDF is being processed
  },
];
```

## Environment Setup

### Redis Configuration

Add to `.env`:

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
# Optional: for production
# REDIS_URL=redis://user:password@host:port
```

### Running Redis Locally

**Docker (Recommended):**

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Homebrew (macOS):**

```bash
brew install redis
brew services start redis
```

**Manual:**

```bash
redis-server
```

## Job Data Schema

```typescript
interface PdfDownloadJobData {
  pdfUrl: string; // URL to fetch PDF from
  shipmentId: string; // Identifier for the shipment
  fileName: string; // Name for stored PDF
  docType: DocumentType; // LABEL | INVOICE | PROOF | RECEIPT | CUSTOMS
}
```

## Job States & Lifecycle

```
WAITING → ACTIVE → COMPLETED (success)
       ↘    ↓   ↙
            FAILED (after 3 retries)
```

**Retry Policy:**

- Max Attempts: 3
- Backoff Strategy: Exponential
- Initial Delay: 2 seconds
- Max Delay: Auto-calculated based on attempts

## Monitoring & Querying

### Get Queue Statistics

```typescript
// In any service that has PdfQueueService injected
const stats = await this.pdfQueueService.getQueueStats();
console.log(stats);
// Output: { waiting: 5, active: 2, completed: 100, failed: 3 }
```

### Get Job Status

```typescript
// jobId returned from enqueuePdfDownload()
const status = await this.pdfQueueService.getJobStatus(jobId);
console.log(status);
// Output: {
//   state: 'completed',
//   progress: 100,
//   result: { success: true, documentId: '...', fileName: '...' }
// }
```

### List Pending Jobs

```typescript
const pending = await this.pdfQueueService.getPendingJobs();
console.log(pending.length); // Number of waiting jobs
```

## Error Handling

### Automatic Retries

Failed downloads automatically retry up to 3 times with exponential backoff before being marked as failed.

### Failed Jobs

Failed jobs are stored in Redis and can be:

1. **Manual Inspection** - Check job data and error reason
2. **Manual Retry** - Re-enqueue with same data
3. **Manual Cleanup** - Remove from failure queue

### Queue Enqueue Failure

If the queue itself fails to enqueue (Redis down, etc.):

```typescript
// In PaqueteExpressCarrier.createShipment()
if (pdfUrl) {
  try {
    await this.pdfQueueService.enqueuePdfDownload({...});
  } catch (queueError) {
    // Log but don't fail shipment creation
    this.logger.error(`Failed to enqueue PDF: ${queueError.message}`);
    // Shipment still returns successfully
  }
}
```

This design ensures:

- ✅ Shipment creation never blocked by PDF download
- ✅ PDF downloads retry automatically
- ✅ Failed PDFs don't cause shipment failures
- ✅ Admin can manually retry failed jobs

## Database Schema: DocumentMetadata

When a PDF is stored successfully, a `DocumentMetadata` record is created:

```typescript
{
  _id: ObjectId,
  filename: string;          // Original filename
  documentType: DocumentType; // LABEL, INVOICE, etc.
  gridFsId: ObjectId;        // Reference to GridFS file
  shipmentId: string;        // Links to shipment
  createdAt: Date;
  expiresAt?: Date;          // Optional expiry (depends on config)
  isEncrypted: boolean;      // true (always encrypted)
  encryptionAlgorithm: string; // "aes-256-gcm"
  encryptionVersion: number; // For future compatibility
}
```

## Production Considerations

### Scaling

For high volume scenarios:

1. **Multiple Job Processors**
   - Run multiple instances of the app (Kubernetes, Docker)
   - Bull supports distributed job processing

2. **Redis Persistence**
   - Enable AOF (Append-Only File) or RDB snapshots
   - Use Redis Sentinel for HA

3. **Monitoring**
   - Use Bull UI dashboard (optional)
   - Monitor job failure rates
   - Alert on queue depth > threshold

### Security

- ✅ PDFs encrypted at rest (AES-256-GCM)
- ✅ Jobs don't contain sensitive data (only URLs)
- ✅ Redis connection should use TLS in production
- ✅ Implement job rate limiting if needed

## Troubleshooting

### Queue Not Processing Jobs

**Check Redis Connection:**

```bash
redis-cli ping
# Output: PONG
```

**Check Queue Status:**

```typescript
const stats = await this.pdfQueueService.getQueueStats();
console.log(stats);
```

### PDF Download Timeout

Increase timeout in `pdf-download.processor.ts`:

```typescript
const response = await axios.get(pdfUrl, {
  responseType: 'arraybuffer',
  timeout: 60000, // 60 seconds (default: 30 seconds)
});
```

### Storage Provider Issues

Verify GridFS is accessible:

```typescript
// Check in DocumentService
const doc = await this.documentService.getDocument(documentId);
```

## API Endpoints (Optional)

You can add monitoring endpoints to `DocumentsController`:

```typescript
@Get('queue/stats')
async getQueueStats() {
  return this.pdfQueueService.getQueueStats();
}

@Get('queue/jobs/:jobId')
async getJobStatus(@Param('jobId') jobId: string) {
  return this.pdfQueueService.getJobStatus(jobId);
}

@Get('queue/pending')
async getPendingJobs() {
  return this.pdfQueueService.getPendingJobs();
}
```

## References

- **Bull Documentation:** https://docs.bullmq.io/
- **NestJS Bull Module:** https://docs.nestjs.com/techniques/queues
- **Redis:** https://redis.io/
