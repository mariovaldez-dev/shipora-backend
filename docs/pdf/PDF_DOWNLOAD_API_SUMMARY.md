# Resumen: API de Descarga de PDFs por Tracking/Master ID

## 🎯 Objetivo Completado

Creamos una **API para obtener PDFs guardados en GridFS por tracking o master ID**, permitiendo que los usuarios obtengan URLs descargables para los shipments creados.

## 📋 Componentes Implementados

### 1. **DocumentService** - Nuevos Métodos

**Ubicación:** `src/documents/services/document.service.ts`

**Métodos agregados:**

```typescript
// Obtener documento por tracking/master ID
async getDocumentByTracking(trackingNumberOrMasterId: string): Promise<DocumentMetadata | null>

// Obtener todos los LABEL documents de un shipment
async getShipmentLabels(shipmentId: string): Promise<DocumentMetadata[]>
```

**Funcionamiento:**

- Busca en MongoDB por `shipmentId` y `type = LABEL`
- Retorna `null` si no encuentra
- Filtra documentos no eliminados

### 2. **DocumentsController** - Nuevos Endpoints

**Ubicación:** `src/documents/infrastructure/controllers/documents.controller.ts`

**3 Nuevos Endpoints:**

#### A. `GET /documents/tracking/:trackingOrMasterId`

Obtiene metadata del PDF + URL descargable

```
GET /documents/tracking/SHP344960121201
→ Returns: { document: {...}, downloadUrl: "/documents/507f.../download" }
```

#### B. `GET /documents/tracking/:trackingOrMasterId/download`

Descarga directamente el PDF (flujo completo: busca → descifra → retorna)

```
GET /documents/tracking/SHP344960121201/download
→ Returns: PDF file (application/pdf)
```

#### C. `GET /documents/labels/:shipmentId`

Lista todos los LABEL documents de un shipment

```
GET /documents/labels/SHP344960121201
→ Returns: Array<DocumentMetadata>
```

**Todos protegidos con `@UseGuards(JwtAuthGuard)`**

## 🔄 Flujo de Uso Completo

```
1. Usuario crea shipment
   POST /shipping/create
   → Retorna { masterTrackingNumber: "SHP344960121201", labelUrl: "queued-for-storage" }

2. Sistema enqueuea descarga del PDF
   (Background: Bull Queue descarga de Paquete Express API)
   → PDF guardado en GridFS + DocumentMetadata creado

3. Usuario solicita el PDF más tarde
   GET /documents/tracking/SHP344960121201
   → Returns: { document: {...}, downloadUrl: "/documents/{id}/download" }

4. Usuario descarga el PDF
   GET /documents/tracking/SHP344960121201/download
   → Returns: PDF descifrado (Binary)
```

## 📊 Datos Retornados

**DocumentMetadata incluye:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "shipmentId": "SHP344960121201",
  "type": "LABEL",
  "fileName": "paquete-express-344960.pdf",
  "storageProvider": "GRIDFS",
  "storagePath": "gridfs://...",
  "downloadCount": 1,
  "downloadedAt": "2025-11-18T...",
  "createdAt": "2025-11-18T...",
  "isEncrypted": true,
  "encryptionAlgorithm": "AES-256-GCM"
}
```

## 🔒 Seguridad

✅ **JWT Authentication** - Todos los endpoints requieren token válido
✅ **AES-256-GCM Encryption** - PDFs encriptados en reposo
✅ **Access Logging** - Se registra cada descarga
✅ **Expiration Support** - PDFs pueden expirar automáticamente

## 📝 Métodos en DocumentService

### Nuevo Método 1: `getDocumentByTracking()`

```typescript
async getDocumentByTracking(trackingNumberOrMasterId: string): Promise<DocumentMetadata | null> {
  // Busca documento por shipmentId = tracking/masterId
  // Tipo LABEL, no eliminado
  return await this.documentModel.findOne({
    shipmentId: trackingNumberOrMasterId,
    type: DocumentType.LABEL,
    status: { $ne: DocumentStatus.DELETED },
  });
}
```

### Nuevo Método 2: `getShipmentLabels()`

```typescript
async getShipmentLabels(shipmentId: string): Promise<DocumentMetadata[]> {
  // Obtiene todos los LABELs de un shipment
  return await this.documentModel.find({
    shipmentId,
    type: DocumentType.LABEL,
    status: { $ne: DocumentStatus.DELETED },
  });
}
```

## 📈 Endpoints Disponibles

| Método | Ruta                                               | Descripción                 | Retorna    |
| ------ | -------------------------------------------------- | --------------------------- | ---------- |
| GET    | `/documents/tracking/:trackingOrMasterId`          | Obtener metadata + URL      | JSON       |
| GET    | `/documents/tracking/:trackingOrMasterId/download` | Descargar PDF               | PDF file   |
| GET    | `/documents/labels/:shipmentId`                    | Listar LABELs               | JSON array |
| POST   | `/documents/upload`                                | Subir documento             | Metadata   |
| GET    | `/documents/:documentId/download`                  | Descargar por ID            | PDF file   |
| GET    | `/documents/:documentId/metadata`                  | Obtener metadata            | JSON       |
| GET    | `/documents/:documentId/signed-url`                | URL firmada temporal        | JSON       |
| GET    | `/documents/shipment/:shipmentId`                  | Todos los docs del shipment | JSON array |
| DELETE | `/documents/:documentId`                           | Eliminar documento          | 204        |

## 🧪 Testing Manual

### 1. Crear Shipment

```bash
curl -X POST http://localhost:3000/shipping/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...shipmentData...}'

# Response:
# { masterTrackingNumber: "SHP344960121201", labelUrl: "queued-for-storage" }
```

### 2. Esperar a que se procese el PDF (1-5 segundos)

```bash
sleep 2
```

### 3. Obtener Metadata del PDF

```bash
curl -X GET \
  "http://localhost:3000/documents/tracking/SHP344960121201" \
  -H "Authorization: Bearer <token>"

# Response:
# {
#   document: {...},
#   downloadUrl: "/documents/507f1f77bcf86cd799439011/download"
# }
```

### 4. Descargar el PDF

```bash
curl -X GET \
  "http://localhost:3000/documents/tracking/SHP344960121201/download" \
  -H "Authorization: Bearer <token>" \
  -o label.pdf
```

## 📚 Documentación Generada

- **`docs/pdf/PDF_DOWNLOAD_API.md`** - Guía completa de API con ejemplos

## 🎓 Integración con Shipment Flow

En `src/carriers/implementations/paquete-express.carrier.ts`:

```typescript
// Después de crear shipment, enqueamos PDF
if (pdfUrl) {
  await this.pdfQueueService.enqueuePdfDownload({
    pdfUrl,
    shipmentId: masterId, // ← Importante: usa masterId como shipmentId
    fileName: `paquete-express-${masterId}.pdf`,
    docType: DocumentType.LABEL,
  });
}

// Retornamos inmediatamente
return [
  {
    masterTrackingNumber: masterId,
    trackingNumber: trackingId,
    labelUrl: 'queued-for-storage', // Indica que está en proceso
  },
];
```

Luego, cuando el usuario quiera descargar:

```
GET /documents/tracking/{masterId}/download
```

## ✅ Archivos Modificados/Creados

| Archivo                                                            | Tipo     | Cambios                |
| ------------------------------------------------------------------ | -------- | ---------------------- |
| `src/documents/services/document.service.ts`                       | Modified | +2 métodos públicos    |
| `src/documents/infrastructure/controllers/documents.controller.ts` | Modified | +3 endpoints           |
| `docs/pdf/PDF_DOWNLOAD_API.md`                                     | Created  | Documentación completa |

## 🚀 Próximos Pasos (Opcionales)

1. **Agregar Monitoring Endpoints:**

   ```typescript
   GET /documents/queue/stats      // Estadísticas de cola
   GET /documents/queue/jobs/:id   // Status de job específico
   ```

2. **Retry Manual para PDFs Fallidos:**

   ```typescript
   POST /documents/:documentId/retry  // Reintentar descarga
   ```

3. **Webhook de Completación:**

   ```typescript
   // Notificar al usuario cuando PDF esté listo
   POST /shipment/webhooks/:shipmentId/pdf-ready
   ```

4. **Generación de QR:**
   ```typescript
   // Incluir QR en PDF descargable
   GET /documents/:documentId/qr
   ```

## ✨ Estado Final

✅ **Compilación exitosa** - `pnpm build` sin errores
✅ **API funcional** - 3 nuevos endpoints listados
✅ **Seguridad** - Autenticación + Encriptación
✅ **Documentado** - Guía completa con ejemplos
✅ **Integrado** - Funciona con Bull Queue + GridFS

**Total de líneas de código agregado:** ~150 líneas (métodos + endpoints)
