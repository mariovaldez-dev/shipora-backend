import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import {
  DocumentMetadata,
  DocumentMetadataSchema,
} from './entities/document-metadata.entity';
import { EncryptionService } from './services/encryption.service';
import { DocumentService } from './services/document.service';
import { DocumentsController } from './infrastructure/controllers/documents.controller';
import { GridFsStorageService } from '../storage/providers/gridfs-storage.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PdfQueueService } from './jobs/pdf-queue.service';
import { PdfDownloadProcessor } from './jobs/pdf-download.processor';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'pdf-queue',
    }),
    MongooseModule.forFeature([
      {
        name: DocumentMetadata.name,
        schema: DocumentMetadataSchema,
      },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [
    EncryptionService,
    DocumentService,
    GridFsStorageService,
    PdfQueueService,
    PdfDownloadProcessor,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (
        configService: ConfigService,
        gridFs: GridFsStorageService,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider: any = configService.get('STORAGE_PROVIDER');
        if (provider === 'GRIDFS') return gridFs;
        // default to GRIDFS if not specified
        return gridFs;
      },
      inject: [ConfigService, GridFsStorageService],
    },
  ],
  exports: [
    EncryptionService,
    DocumentService,
    GridFsStorageService,
    PdfQueueService,
    PdfDownloadProcessor,
    'STORAGE_SERVICE',
  ],
})
export class DocumentsModule {}
