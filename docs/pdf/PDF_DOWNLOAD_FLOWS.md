# Flujos de API - Diagramas y Secuencias

## 1. Flujo Completo: Crear Shipment → Obtener PDF

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Frontend)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. POST /shipping/create
                                    │ (Con datos de shipment)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / Shipping Controller                     │
│                                                                          │
│  @Post('create')                                                         │
│  async createShipment(shipmentData)                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ PaqueteExpress│ │ Estafeta     │  │ Otros        │
         │ Adapter      │  │ Adapter      │  │ Carriers     │
         └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  │
                                  │ Crea guía en API externa
                                  │ Obtiene: trackingId, masterId, pdfUrl
                                  ▼
                    ┌──────────────────────────────────┐
                    │ PdfQueueService.enqueuePdfDownload│
                    │                                  │
                    │ - Crea Job en Bull Queue         │
                    │ - Returns jobId                  │
                    │ - NO ESPERA por PDF              │
                    └──────────────┬───────────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
                │                                    │
                ▼ (Inmediato al usuario)             ▼ (Background)
         ┌──────────────────┐              ┌──────────────────────┐
         │ Retorna al Cliente:              │ Bull Queue Processor │
         │                                 │                      │
         │ {                               │ - Descarga PDF       │
         │   masterTrackingNumber: "...",  │   (30s timeout)      │
         │   trackingNumber: "...",        │ - Encripta (AES-256) │
         │   labelUrl: "queued-for-storage"│ - Guarda en GridFS   │
         │ }                               │ - Crea DocumentMeta  │
         │                                 │ - Retry si falla     │
         └──────────────────┘              └──────────────────────┘
                │
     (Usuario ve inmediatamente)
                │
                │ [5-60 segundos después]
                │
                │ 2. GET /documents/tracking/{masterId}
                ▼
         ┌──────────────────────────────┐
         │ DocumentsController          │
         │ @Get('tracking/:...')        │
         │                              │
         │ - Busca en MongoDB           │
         │ - Encuentra DocumentMetadata │
         │ - Retorna + URL descargable  │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │ Respuesta:                   │
         │ {                            │
         │   document: {...},           │
         │   downloadUrl: "/documents.."|
         │ }                            │
         └──────────────────────────────┘
                    │
                    │ 3. GET /documents/tracking/{masterId}/download
                    ▼
         ┌──────────────────────────────┐
         │ DocumentService.getDocument()│
         │                              │
         │ - Busca en MongoDB           │
         │ - Descarga de GridFS         │
         │ - Descifra (AES-256-GCM)     │
         │ - Log de acceso              │
         │ - Retorna Buffer             │
         └──────────┬───────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │ Response: PDF Descifrado     │
         │ Content-Type: application/pdf│
         │ Content-Disposition: attach. │
         └──────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │ CLIENTE descarga PDF ✓       │
         └──────────────────────────────┘
```

## 2. Flujo del Job Processor (Background)

```
┌─────────────────────────────────────────────────────────────┐
│          Bull Queue: pdf-queue (Redis)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Job: download-and-store
                              │ Data: { pdfUrl, shipmentId, fileName, docType }
                              ▼
        ┌────────────────────────────────────────────────┐
        │ PdfDownloadProcessor                           │
        │ @Processor('pdf-queue')                        │
        │ @Process('download-and-store')                │
        └────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────────┐
        │ 1. Descarga PDF desde pdfUrl                   │
        │    - axios.get(pdfUrl)                        │
        │    - responseType: 'arraybuffer'              │
        │    - timeout: 30000 ms                         │
        │    - Valida que exista buffer                  │
        └────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────────┐
        │ 2. Encripta PDF                                │
        │    - EncryptionService.encrypt()              │
        │    - Algorithm: AES-256-GCM                    │
        │    - IV + ciphertext + authTag                 │
        └────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────────┐
        │ 3. Sube a GridFS                               │
        │    - StorageService.upload()                  │
        │    - Path: documents/{shipmentId}/{type}/...  │
        │    - Metadata incluido                         │
        └────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────────────────────────────────┐
        │ 4. Crea DocumentMetadata en MongoDB            │
        │    - shipmentId                               │
        │    - type (LABEL)                             │
        │    - storagePath, storageUrl                  │
        │    - encryptionIv, encryptionAuthTag          │
        │    - fileName                                 │
        └────────┬───────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼ (Éxito)               ▼ (Error)
┌──────────────┐      ┌──────────────────┐
│ Job.done()   │      │ Job.retry()      │
│ Status: OK   │      │ Retry count: 3   │
│ Return:      │      │ Backoff: 2s, 4s, 8s
│ {            │      │                  │
│   success:   │      │ Después del 3er  │
│   documentId,│      │ intento fallido: │
│   fileName   │      │ Job.failed()     │
│ }            │      └──────────────────┘
└──────────────┘
```

## 3. Flujo de Obtención de Documento

```
┌────────────────────────────────────────────┐
│ Cliente solicita: GET /documents/tracking/..│
│ Authorization: Bearer <token>              │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ DocumentsController                        │
│ @Get('tracking/:trackingOrMasterId')      │
│ @UseGuards(JwtAuthGuard)                   │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ DocumentService.getDocumentByTracking()    │
│                                             │
│ Query: {                                    │
│   shipmentId: trackingOrMasterId,          │
│   type: DocumentType.LABEL,                │
│   status: { $ne: DELETED }                │
│ }                                           │
└────────────┬───────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼ (Found)        ▼ (Not found)
┌──────────────────┐ ┌─────────────────┐
│ DocumentMetadata │ │ return null     │
│ {                │ └────────┬────────┘
│   _id: ObjectId  │          │
│   shipmentId,    │          ▼
│   type,          │ ┌─────────────────┐
│   fileName,      │ │ Return JSON:    │
│   storagePath,   │ │ {               │
│   ...            │ │   document: null│
│ }                │ │   downloadUrl:  │
└────────┬─────────┘ │   null          │
         │           │ }               │
         │           └─────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Construir Response             │
│ {                              │
│   document: { ...metadata },   │
│   downloadUrl: "/documents/    │
│                {id}/download"  │
│ }                              │
└────────────┬───────────────────┘
             │
             ▼
       ┌──────────────┐
       │ Return 200 OK│
       └──────────────┘
```

## 4. Flujo de Descarga (Download)

```
┌────────────────────────────────────────────┐
│ Cliente solicita descarga:                  │
│ GET /documents/tracking/SHP.../download    │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ DocumentsController.downloadDocumentByTracking()
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ 1. Buscar Documento                        │
│    getDocumentByTracking(tracking)         │
└────────────┬───────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼ (Found)        ▼ (Not found)
┌──────────────────┐ ┌──────────────────┐
│ DocumentMetadata │ │ 404 JSON Error   │
└────────┬─────────┘ └──────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ 2. Descargar desde GridFS                  │
│    DocumentService.getDocument()           │
│                                             │
│    a) Buscar metadata completa              │
│    b) Descargar de StorageService           │
│    c) Validar no esté expirado              │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ 3. Descifrar PDF                           │
│    EncryptionService.decrypt()             │
│                                             │
│    Input: {                                 │
│      ciphertext,                            │
│      iv: metadata.encryptionIv,            │
│      authTag: metadata.encryptionAuthTag   │
│    }                                        │
│                                             │
│    Output: Buffer (PDF descifrado)          │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ 4. Log de Acceso                           │
│    metadata.accessLogs.push({             │
│      ip, userAgent, timestamp              │
│    })                                       │
│    metadata.downloadCount++                │
│    metadata.downloadedAt = now()           │
└────────────┬───────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────┐
│ 5. Retornar PDF                            │
│    response.set({                          │
│      'Content-Type': 'application/pdf',   │
│      'Content-Length': buffer.length,     │
│      'Content-Disposition':                │
│        'attachment; filename="..."'       │
│    })                                       │
│    response.send(buffer)                   │
└────────────┬───────────────────────────────┘
             │
             ▼
       ┌──────────────────┐
       │ Cliente recibe   │
       │ PDF Descifrado ✓ │
       └──────────────────┘
```

## 5. Matriz de Estados - Documento

```
Estado Inicial: PENDING
                  │
                  ├─ ✓ Almacenado exitosamente
                  │  → STORED
                  │
                  ├─ ✗ Error en descarga
                  │  → FAILED (Reintentos automáticos)
                  │
                  └─ ✓ Expiración de tiempo
                     → EXPIRED

Estado STORED:
  ├─ Disponible para descargar
  ├─ Se registran accesos
  └─ downloadCount incrementa

Estado EXPIRED:
  ├─ No se permite descargar
  └─ Se recomienda generar nuevo

Estado DELETED:
  ├─ Eliminado de GridFS
  └─ No recuperable
```

## 6. Flujo de Error con Retries

```
┌──────────────────────────────────┐
│ Job comienza                     │
│ Intentos: 1/3                    │
└──────────┬───────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Descargar PDF│
    └──────┬───────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
   ✓ OK      ✗ Error
   │          (Timeout, 404, etc)
   │          │
   │          ▼
   │      ┌─────────────────┐
   │      │ Error: Linea  X │
   │      └────────┬────────┘
   │               │
   │               ▼
   │          ┌─────────────────┐
   │          │ Reintentar?     │
   │          │ Intentos < 3?   │
   │          └─────┬───────────┘
   │                │
   │      ┌─────────┘
   │      │
   │      ├─ YES → Esperar 2s → Job reinicia
   │      │
   │      └─ NO → Job FAILED
   │             Guardar error en metadata
   │
   ▼
┌──────────────┐
│ Job COMPLETED│
│ PDF Guardado │
└──────────────┘
```

## 7. Integración con Shipment Response

```
Frontend Request:
POST /shipping/create
{
  products: [...],
  from: {...},
  to: {...}
}

Inmediato (t=0):
Response 200 OK
{
  masterTrackingNumber: "SHP344960121201",
  trackingNumber: "12345",
  labelUrl: "queued-for-storage"
  ↑
  Indica que PDF está siendo procesado
}

Background (t=0-30s):
Bull Job procesa PDF
GridFS almacena PDF
DocumentMetadata creado

Posterior (t=30s+):
GET /documents/tracking/SHP344960121201
Response:
{
  document: {
    fileName: "paquete-express-...",
    downloadCount: 0,
    createdAt: "2025-11-18T..."
  },
  downloadUrl: "/documents/507f.../download"
}

Cliente descarga:
GET /documents/tracking/SHP344960121201/download
Response: PDF Binary
```

## ✨ Resumen de Flujos

| Flujo            | Duracion   | Sincrónico      | Componentes               |
| ---------------- | ---------- | --------------- | ------------------------- |
| Crear Shipment   | <100ms     | Sí              | Carrier + Controller      |
| Enqueue PDF      | <50ms      | Sí              | PdfQueueService           |
| Procesar PDF     | 1-30s      | No (Background) | Bull + GridFS             |
| Obtener Metadata | <10ms      | Sí              | DocumentService + DB      |
| Descargar PDF    | 10-100ms   | Sí              | DocumentService + Decrypt |
| **Total E2E**    | **30-60s** | Híbrido         | Todos                     |
