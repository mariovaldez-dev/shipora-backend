import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';

export interface IStorageService {
  upload(options: {
    key: string;
    buffer: Buffer;
    metadata?: Record<string, string>;
  }): Promise<{ url: string | null; path: string }>;

  download(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;

  getSignedUrl(key: string, expiresInHours?: number): Promise<string>;

  exists(key: string): Promise<boolean>;
}

@Injectable()
export class GridFsStorageService implements IStorageService, OnModuleInit {
  private bucket: GridFSBucket;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not ready - db is undefined');
    }
    this.bucket = new GridFSBucket(db, { bucketName: 'documents' });
  }

  /**
   * Uploads a buffer to GridFS. Uses filename=key. Stores provided metadata.
   * Returns path as gridfs://<fileId>
   */
  async upload(options: {
    key: string;
    buffer: Buffer;
    metadata?: Record<string, string>;
  }): Promise<{ url: string | null; path: string }> {
    const uploadStream = this.bucket.openUploadStream(options.key, {
      metadata: options.metadata || {},
      contentType: 'application/pdf',
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.end(options.buffer, (err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // The file id is available on uploadStream.id
    const fileId = uploadStream.id;
    return { url: null, path: `gridfs://${fileId.toHexString()}` };
  }

  /**
   * Downloads file from GridFS by key (filename) or by id (gridfs://id)
   */
  async download(keyOrPath: string): Promise<Buffer> {
    // Accept either gridfs://<id> or filename
    if (keyOrPath.startsWith('gridfs://')) {
      const id = keyOrPath.replace('gridfs://', '');
      const objectId = new ObjectId(id);
      const downloadStream = this.bucket.openDownloadStream(objectId);
      return await this.streamToBuffer(downloadStream);
    }

    // treat as filename
    const cursor = this.bucket
      .find({ filename: keyOrPath })
      .sort({ uploadDate: -1 })
      .limit(1);
    const files = await cursor.toArray();
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }
    const downloadStream = this.bucket.openDownloadStream(files[0]._id);
    return await this.streamToBuffer(downloadStream);
  }

  /**
   * Delete file by filename or gridfs://id
   */
  async delete(keyOrPath: string): Promise<void> {
    if (keyOrPath.startsWith('gridfs://')) {
      const id = keyOrPath.replace('gridfs://', '');
      const objectId = new ObjectId(id);
      await this.bucket.delete(objectId);
      return;
    }

    const cursor = this.bucket
      .find({ filename: keyOrPath })
      .sort({ uploadDate: -1 })
      .limit(1);
    const files = await cursor.toArray();
    if (!files || files.length === 0) return;
    await this.bucket.delete(files[0]._id);
  }

  async getSignedUrl(_key: string, _expiresInHours = 1): Promise<string> {
    // GridFS doesn't provide signed URLs. Return an application endpoint path that can stream the file.
    // We'll return a path that the DocumentController can expose, e.g. /documents/stream/:id
    if (_key.startsWith('gridfs://')) {
      const id = _key.replace('gridfs://', '');
      return `/documents/stream/${id}`;
    }
    // otherwise, it's a filename; return route with filename
    return Promise.resolve(
      `/documents/stream-by-filename/${encodeURIComponent(_key)}`,
    );
  }

  async exists(keyOrPath: string): Promise<boolean> {
    if (keyOrPath.startsWith('gridfs://')) {
      const id = keyOrPath.replace('gridfs://', '');
      const objectId = new ObjectId(id);
      const cursor = this.bucket.find({ _id: objectId }).limit(1);
      const files = await cursor.toArray();
      return files.length > 0;
    }

    const cursor = this.bucket.find({ filename: keyOrPath }).limit(1);
    const files = await cursor.toArray();
    return files.length > 0;
  }

  private streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: any) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err: any) => reject(new Error(String(err))));
    });
  }

  getGuideUrl(guideId: string): string {
    return `${this.configService.get<string>(
      'APP_URL',
    )}/documents/stream/${guideId}`;
  }
}
