# 🚀 Comparativa: AWS S3 vs Firebase Storage (Lado a Lado)

## Resumen Ejecutivo

| Aspecto                 | AWS S3       | Firebase     |
| ----------------------- | ------------ | ------------ |
| **Setup**               | 20-30 min    | 10-15 min ✅ |
| **Costo (100GB)**       | $15/mes      | $18/mes      |
| **Control**             | Máximo ✅    | Medio        |
| **Escalabilidad**       | Ilimitada ✅ | Ilimitada    |
| **Encriptación Nativa** | KMS ✅       | No           |
| **Vendor Lock-in**      | Bajo ✅      | Alto         |
| **Curva Aprendizaje**   | Media        | Baja ✅      |
| **Para Producción**     | ✅✅✅       | ✅✅         |

---

## Opción 1: AWS S3 (Recomendado para Producción)

### Instalación

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Servicio S3

```typescript
// src/storage/providers/s3.service.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class S3StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = configService.get('AWS_S3_BUCKET');
  }

  async upload(options: {
    key: string;
    buffer: Buffer;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; path: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Body: options.buffer,
      Metadata: options.metadata,
      // Encriptación server-side con KMS
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.configService.get('AWS_KMS_KEY_ID'),
      // Configuración de seguridad
      ContentType: 'application/pdf',
      ACL: 'private',
    });

    await this.s3.send(command);

    return {
      path: `s3://${this.bucket}/${options.key}`,
      url: `https://${this.bucket}.s3.amazonaws.com/${options.key}`,
    };
  }

  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3.send(command);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Configuración AWS

```env
# .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=shipora-documents
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
```

### Costos AWS

```
PUT requests: $0.005 por 1000 requests
GET requests: $0.0004 por 10000 requests
Storage (100 GB): $2.30/mes
Total: ~$3/mes para 100GB con 1000 uploads/mes
```

---

## Opción 2: Firebase Storage (Rápido para MVP)

### Instalación

```bash
pnpm add firebase-admin
```

### Servicio Firebase

```typescript
// src/storage/providers/firebase.service.ts
import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseStorageService {
  private bucket: admin.storage.Bucket;

  constructor(private configService: ConfigService) {
    // Inicializar Firebase (una sola vez en app.module.ts)
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(this.configService.get('FIREBASE_SERVICE_ACCOUNT_KEY')),
        ),
        storageBucket: configService.get('FIREBASE_STORAGE_BUCKET'),
      });
    }

    this.bucket = admin.storage().bucket();
  }

  async upload(options: {
    key: string;
    buffer: Buffer;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; path: string }> {
    const file = this.bucket.file(options.key);

    await file.save(options.buffer, {
      metadata: {
        metadata: {
          encrypted: 'true',
          uploadedAt: new Date().toISOString(),
          ...options.metadata,
        },
      },
      public: false,
    });

    return {
      path: `gs://${this.bucket.name}/${options.key}`,
      url: `https://storage.googleapis.com/${this.bucket.name}/${options.key}`,
    };
  }

  async download(key: string): Promise<Buffer> {
    const file = this.bucket.file(key);
    const [buffer] = await file.download();
    return buffer;
  }

  async delete(key: string): Promise<void> {
    const file = this.bucket.file(key);
    await file.delete();
  }

  async getSignedUrl(key: string, expiresInHours = 1): Promise<string> {
    const file = this.bucket.file(key);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInHours * 60 * 60 * 1000,
    });
    return url;
  }

  async exists(key: string): Promise<boolean> {
    const file = this.bucket.file(key);
    const [exists] = await file.exists();
    return exists;
  }
}
```

### Configuración Firebase

```env
# .env
FIREBASE_PROJECT_ID=shipora-prod
FIREBASE_STORAGE_BUCKET=shipora-prod.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY={
  "type": "service_account",
  "project_id": "shipora-prod",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-abcde@shipora-prod.iam.gserviceaccount.com",
  ...
}
```

### Costos Firebase

```
Almacenamiento: $0.18/GB después del primer 1 GB gratis
Descargas: $0.01/GB
Para 100 GB: $18/mes + $1/GB descargado
```

---

## Comparación de Código

### Setup Inicial

**AWS S3:**

```typescript
// En app.module.ts
import { S3StorageService } from './storage/providers/s3.service';

@Module({
  providers: [S3StorageService],
})
export class AppModule {}
```

**Firebase:**

```typescript
// En app.module.ts
import { FirebaseStorageService } from './storage/providers/firebase.service';

// Firebase se inicializa automáticamente en el servicio
@Module({
  providers: [FirebaseStorageService],
})
export class AppModule {}
```

### Uso en Servicio

**Ambas opciones usan la misma interfaz:**

```typescript
// src/storage/storage.service.ts (interfaz común)
export interface IStorageService {
  upload(options): Promise<{ url: string; path: string }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?): Promise<string>;
  exists(key: string): Promise<boolean>;
}

// DocumentService usa la interfaz sin importar el proveedor
@Injectable()
export class DocumentService {
  constructor(
    @Inject('STORAGE_SERVICE')
    private storage: IStorageService,
  ) {}

  async saveDocument(options: any) {
    // Mismo código para S3 y Firebase
    const { url } = await this.storage.upload({
      key: 'documents/2025/11/invoice.pdf.enc',
      buffer: encryptedPdf,
    });
    return url;
  }
}
```

---

## Estrategia de Encriptación (Igual para Ambas)

```typescript
// src/encryption/encryption.service.ts
@Injectable()
export class EncryptionService {
  encrypt(data: Buffer) {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    return {
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
      ciphertext: encrypted.toString('hex'),
    };
  }

  decrypt(data: { iv: string; authTag: string; ciphertext: string }): Buffer {
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    const ciphertext = Buffer.from(data.ciphertext, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
```

---

## Module Configuration (Usar Uno u Otro)

```typescript
// src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3StorageService } from './providers/s3.service';
import { FirebaseStorageService } from './providers/firebase.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get('STORAGE_PROVIDER');

        if (provider === 'S3') {
          return new S3StorageService(configService);
        } else if (provider === 'FIREBASE') {
          return new FirebaseStorageService(configService);
        }

        throw new Error('Unknown storage provider');
      },
      inject: [ConfigService],
    },
  ],
  exports: ['STORAGE_SERVICE'],
})
export class StorageModule {}
```

```env
# Elegir en .env
STORAGE_PROVIDER=S3  # o FIREBASE
```

---

## Decisión Final

### Elige AWS S3 Si:

- ✅ Necesitas máximo control
- ✅ Volumen muy grande (>500GB)
- ✅ Integración empresarial
- ✅ Multi-región
- ✅ Auditoría completa

### Elige Firebase Si:

- ✅ MVP/Testing rápido
- ✅ Setup < 15 minutos
- ✅ No quieres configurar AWS
- ✅ Volumen pequeño (<100GB)
- ✅ Simplicidad primera

### Elige Ambas Si:

- ✅ Quieres flexibilidad
- ✅ Testing contra ambos
- ✅ Migración futura

---

## Próximo Paso

**¿Cuál implementamos primero?**

1. **AWS S3** (recomendado producción)
2. **Firebase Storage** (rápido MVP)
3. **Ambas** (máxima flexibilidad)

Dime y te doy el código completo listo para copiar 🚀
