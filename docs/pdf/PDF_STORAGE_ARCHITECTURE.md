# 📊 Arquitectura de Almacenamiento de PDFs

## 1. Flujo de Generación y Almacenamiento

```
CLIENTE (APP)
    │
    ├─> Solicita etiqueta de envío
    │
    └─> POST /shipping/generate-label
         │
         ├─> ShippingService
         │   ├─> GetRates
         │   ├─> CreateShipment
         │   └─> Generate Label PDF
         │
         ├─> PdfGeneratorService
         │   ├─ Genera PDF (pdfkit, html2pdf, etc)
         │   ├─ Agregar QR/barcode
         │   └─ Retorna Buffer
         │
         ├─> EncryptionService
         │   ├─ Genera IV + Key
         │   ├─ AES-256-GCM encrypt
         │   └─ Retorna {iv, authTag, ciphertext}
         │
         ├─> StorageService (S3 o Firebase)
         │   ├─ Guarda archivo encriptado
         │   ├─ Retorna URL firmada
         │   └─ Registra en BD
         │
         └─> Retorna al cliente:
             {
               url: "https://s3.../invoice-001.pdf.enc",
               downloadUrl: "https://api.../download/...",
               expiresAt: "2025-11-25T10:00:00Z"
             }
```

---

## 2. Arquitectura por Componentes

```
┌────────────────────────────────────────────────────────┐
│                    CLIENTE                             │
│  (Descarga PDF desde downloadUrl)                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │     SHIPPING CONTROLLER          │
        │  ├─ POST /generate-label        │
        │  └─ GET /download/:documentId   │
        └──────────────────┬───────────────┘
                           │
        ┌──────────────────┴────────────────────┐
        │                                       │
        ▼                                       ▼
┌─────────────────────┐              ┌──────────────────┐
│  SHIPPING SERVICE   │              │  DOCUMENT SERVICE│
│  ├─ Generate PDF    │              │  ├─ Download     │
│  └─ Coordina todo   │              │  ├─ Decrypt      │
└────────┬────────────┘              │  └─ Stream       │
         │                           └──────┬───────────┘
         ▼                                  │
    ┌──────────────────────┐               │
    │ PDF GENERATOR SERVICE│               │
    │ ├─ Genera PDF        │               │
    │ ├─ Agrega QR         │               │
    │ ├─ Valida            │               │
    │ └─ Retorna Buffer    │               │
    └────────┬─────────────┘               │
             │                             │
             ▼                             │
    ┌──────────────────────┐               │
    │ ENCRYPTION SERVICE   │               │
    │ ├─ Encripta PDF      │               │
    │ ├─ AES-256-GCM       │               │
    │ ├─ Guarda IV+Tag     │               │
    │ └─ Retorna encrypted │               │
    └────────┬─────────────┘               │
             │                             │
             ▼                             │
    ┌──────────────────────┐               │
    │  STORAGE SERVICE     │◄──────────────┘
    │  (S3 o Firebase)     │
    │ ├─ Upload            │
    │ ├─ Store metadata    │
    │ └─ Retorna URL       │
    └────────┬─────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌────────┐      ┌───────────┐
│  S3    │      │ Firebase  │
│ Bucket │      │ Storage   │
│        │      │           │
│ PDFs   │      │ PDFs      │
│ Enc.   │      │ Enc.      │
└────────┘      └───────────┘
```

---

## 3. Base de Datos - Documentos Metadata

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,

  -- Identificación
  shipment_id UUID NOT NULL,
  type VARCHAR(50),  -- 'LABEL', 'INVOICE', 'PROOF'

  -- Almacenamiento
  storage_provider VARCHAR(20),  -- 'S3' o 'FIREBASE'
  storage_path VARCHAR(500),     -- s3://bucket/path/file.pdf.enc
  storage_url VARCHAR(500),      -- URL firmada

  -- Encriptación
  encryption_algorithm VARCHAR(50),  -- 'AES-256-GCM'
  encryption_iv VARCHAR(500),       -- Guardado en BD
  encryption_auth_tag VARCHAR(500), -- Guardado en BD

  -- Metadata
  file_name VARCHAR(255),
  file_size_bytes INT,
  mime_type VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  downloaded_at TIMESTAMP,

  -- Seguridad
  download_count INT,
  access_logs JSONB,  -- {ip, user_agent, timestamp}

  -- Estado
  status VARCHAR(50),  -- 'PENDING', 'STORED', 'EXPIRED', 'DELETED'
);

-- Índices
CREATE INDEX idx_documents_shipment_id ON documents(shipment_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_expires_at ON documents(expires_at);
```

---

## 4. Clase DocumentsMetadata

```typescript
@Entity()
export class DocumentMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  shipmentId: string;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType; // LABEL, INVOICE, PROOF

  @Column({ type: 'enum', enum: StorageProvider })
  storageProvider: StorageProvider; // S3, FIREBASE

  @Column()
  storagePath: string; // s3://bucket/path/file.pdf.enc

  @Column({ nullable: true })
  storageUrl: string; // URL firmada temporal

  @Column()
  encryptionAlgorithm: string; // 'AES-256-GCM'

  @Column('text')
  encryptionIv: string; // hex encoded

  @Column('text')
  encryptionAuthTag: string; // hex encoded

  @Column()
  fileName: string;

  @Column()
  fileSizeBytes: number;

  @Column()
  mimeType: string; // 'application/pdf'

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  downloadedAt: Date;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  accessLogs: Array<{
    timestamp: Date;
    ip: string;
    userAgent: string;
    action: string;
  }>;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;
}

export enum DocumentType {
  LABEL = 'LABEL',
  INVOICE = 'INVOICE',
  PROOF = 'PROOF',
  TRACKING = 'TRACKING',
}

export enum StorageProvider {
  S3 = 'S3',
  FIREBASE = 'FIREBASE',
  LOCAL = 'LOCAL',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  STORED = 'STORED',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED',
}
```

---

## 5. Servicios Necesarios

### A. StorageService (Interfaz)

```typescript
// storage/storage.service.interface.ts
export interface IStorageService {
  // Guardar archivo
  upload(options: {
    key: string;
    buffer: Buffer;
    metadata?: Record<string, string>;
  }): Promise<{
    url: string;
    path: string;
  }>;

  // Descargar archivo
  download(key: string): Promise<Buffer>;

  // Eliminar archivo
  delete(key: string): Promise<void>;

  // Generar URL firmada temporal
  getSignedUrl(key: string, expiresInHours?: number): Promise<string>;

  // Verificar existencia
  exists(key: string): Promise<boolean>;
}
```

### B. EncryptionService

```typescript
// encryption/encryption.service.ts
@Injectable()
export class EncryptionService {
  constructor(private configService: ConfigService) {}

  encrypt(data: Buffer): {
    iv: string;
    authTag: string;
    ciphertext: string;
  } {
    const key = Buffer.from(this.configService.get('ENCRYPTION_KEY'), 'hex');
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
    const key = Buffer.from(this.configService.get('ENCRYPTION_KEY'), 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    const ciphertext = Buffer.from(data.ciphertext, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
```

### C. DocumentService

```typescript
// documents/document.service.ts
@Injectable()
export class DocumentService {
  constructor(
    private storageService: IStorageService, // S3 o Firebase
    private encryptionService: EncryptionService,
    private documentRepository: Repository<DocumentMetadata>,
  ) {}

  // Guardar documento encriptado
  async saveDocument(options: {
    shipmentId: string;
    type: DocumentType;
    pdfBuffer: Buffer;
    fileName: string;
  }): Promise<DocumentMetadata> {
    // 1. Encriptar
    const encrypted = this.encryptionService.encrypt(options.pdfBuffer);

    // 2. Guardar en storage
    const storagePath = this.generateStoragePath(options);
    const { url } = await this.storageService.upload({
      key: storagePath,
      buffer: Buffer.from(encrypted.ciphertext, 'hex'),
    });

    // 3. Guardar metadata en BD
    const document = this.documentRepository.create({
      shipmentId: options.shipmentId,
      type: options.type,
      storageProvider: 'S3', // o FIREBASE
      storagePath,
      storageUrl: url,
      encryptionIv: encrypted.iv,
      encryptionAuthTag: encrypted.authTag,
      fileName: options.fileName,
      fileSizeBytes: options.pdfBuffer.length,
      mimeType: 'application/pdf',
      status: DocumentStatus.STORED,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    });

    return this.documentRepository.save(document);
  }

  // Descargar documento desencriptado
  async getDocument(documentId: string): Promise<Buffer> {
    // 1. Obtener metadata
    const document = await this.documentRepository.findOne(documentId);
    if (!document) throw new NotFoundException();

    // 2. Verificar expiracion
    if (document.expiresAt < new Date()) {
      throw new ForbiddenException('Document expired');
    }

    // 3. Descargar del storage
    const encryptedBuffer = await this.storageService.download(
      document.storagePath,
    );

    // 4. Desencriptar
    const decrypted = this.encryptionService.decrypt({
      iv: document.encryptionIv,
      authTag: document.encryptionAuthTag,
      ciphertext: encryptedBuffer.toString('hex'),
    });

    // 5. Registrar acceso
    document.downloadCount++;
    document.accessLogs.push({
      timestamp: new Date(),
      ip: 'TODO: get from request',
      userAgent: 'TODO: get from request',
      action: 'DOWNLOAD',
    });
    await this.documentRepository.save(document);

    return decrypted;
  }

  private generateStoragePath(options: any): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const documentId = uuid();

    return `documents/${year}/${month}/${options.type.toLowerCase()}/${documentId}.pdf.enc`;
  }
}
```

---

## 6. Casos de Uso

### Caso 1: Generar Etiqueta de Envío

```
POST /shipping/shipments/:id/generate-label

RESPUESTA:
{
  "documentId": "uuid-1234",
  "type": "LABEL",
  "downloadUrl": "https://api.shipora.com/documents/uuid-1234/download",
  "expiresAt": "2025-12-17T10:00:00Z",
  "qrCode": "data:image/png;base64,...",
  "fileSize": "245 KB"
}
```

### Caso 2: Descargar Documento

```
GET /documents/:documentId/download

HEADERS:
Authorization: Bearer token

RESPUESTA:
- Content-Type: application/pdf
- Content-Disposition: attachment; filename="invoice-001.pdf"
- Content-Length: 251856

BODY: PDF descencriptado
```

### Caso 3: Listar Documentos de Envío

```
GET /shipping/shipments/:id/documents

RESPUESTA:
[
  {
    "id": "uuid-1",
    "type": "LABEL",
    "status": "STORED",
    "createdAt": "2025-11-17T10:00:00Z",
    "expiresAt": "2025-12-17T10:00:00Z",
    "downloadCount": 3,
    "downloadUrl": "https://..."
  },
  {
    "id": "uuid-2",
    "type": "INVOICE",
    "status": "STORED",
    ...
  }
]
```

---

## 7. Variables de Entorno

```env
# Storage
STORAGE_PROVIDER=S3              # S3 o FIREBASE

# AWS S3 (si STORAGE_PROVIDER=S3)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=shipora-documents

# Google Firebase (si STORAGE_PROVIDER=FIREBASE)
FIREBASE_PROJECT_ID=shipora-prod
FIREBASE_PRIVATE_KEY_ID=key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_STORAGE_BUCKET=shipora-prod.appspot.com

# Encriptación
ENCRYPTION_KEY=<256 bits en hex>  # Generar con: crypto.randomBytes(32).toString('hex')
ENCRYPTION_ALGORITHM=aes-256-gcm

# Documentos
DOCUMENT_EXPIRY_DAYS=30
DOCUMENT_MAX_DOWNLOADS=unlimited  # o número
```

---

## 8. Checklist de Implementación

- [ ] Elegir proveedor (S3 o Firebase)
- [ ] Instalar dependencias
- [ ] Generar clave de encriptación
- [ ] Crear entidades de BD
- [ ] Implementar EncryptionService
- [ ] Implementar StorageService
- [ ] Implementar DocumentService
- [ ] Crear endpoints del controller
- [ ] Tests unitarios
- [ ] Documentación de API

---

## Próximo Paso

¿Cuál es tu preferencia?

1. **AWS S3** - Implementación paso a paso
2. **Firebase Storage** - Implementación paso a paso
3. **Ambas** - Código para poder elegir en deployment

Dime y continuamos 🚀
