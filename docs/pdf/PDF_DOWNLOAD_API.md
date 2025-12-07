# API de Descarga de PDFs por Tracking/Master ID

## Descripción

Nuevos endpoints para obtener PDFs guardados en GridFS usando el tracking number o master ID del shipment. Esto permite que después de crear un shipment, el usuario pueda solicitar el PDF directamente.

## Endpoints

### 1. Obtener Metadata del Documento por Tracking

```http
GET /documents/tracking/:trackingOrMasterId
Authorization: Bearer <jwt_token>
```

**Parámetros:**

- `trackingOrMasterId` (path): Número de tracking o Master ID del shipment

**Respuesta (200 - Documento encontrado):**

```json
{
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "shipmentId": "SHP344960121201",
    "type": "LABEL",
    "fileName": "paquete-express-344960.pdf",
    "storageProvider": "GRIDFS",
    "storagePath": "gridfs://documents/SHP344960121201/LABEL/...",
    "downloadCount": 0,
    "createdAt": "2025-11-18T00:02:11.000Z",
    "updatedAt": "2025-11-18T00:02:11.000Z"
  },
  "downloadUrl": "/documents/507f1f77bcf86cd799439011/download"
}
```

**Respuesta (404 - No encontrado):**

```json
{
  "document": null,
  "downloadUrl": null
}
```

### 2. Descargar PDF por Tracking

```http
GET /documents/tracking/:trackingOrMasterId/download
Authorization: Bearer <jwt_token>
```

**Parámetros:**

- `trackingOrMasterId` (path): Número de tracking o Master ID del shipment

**Respuesta (200):**

- Archivo PDF (Content-Type: application/pdf)
- Headers:
  - `Content-Disposition`: `attachment; filename="paquete-express-344960.pdf"`
  - `Content-Length`: Tamaño del archivo

**Respuesta (404):**

```json
{
  "error": "Document not found for tracking number",
  "tracking": "SHP344960121201"
}
```

**Respuesta (500):**

```json
{
  "error": "Failed to download document",
  "message": "Document has expired"
}
```

### 3. Obtener Todos los PDFs (LABELS) de un Shipment

```http
GET /documents/labels/:shipmentId
Authorization: Bearer <jwt_token>
```

**Parámetros:**

- `shipmentId` (path): ID del shipment

**Respuesta (200):**

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "shipmentId": "SHP344960121201",
    "type": "LABEL",
    "fileName": "paquete-express-344960.pdf",
    "storageProvider": "GRIDFS",
    "storagePath": "gridfs://documents/SHP344960121201/LABEL/...",
    "downloadCount": 1,
    "createdAt": "2025-11-18T00:02:11.000Z"
  }
]
```

## Casos de Uso

### 1. Después de Crear un Shipment

```typescript
// 1. Crear shipment
const response = await fetch('/api/shipping/create', {
  method: 'POST',
  headers: { Authorization: 'Bearer token' },
  body: JSON.stringify(shipmentData),
});

const shipments = await response.json();
const masterId = shipments[0].masterTrackingNumber; // "SHP344960121201"

// 2. Obtener URL del PDF (cuando esté listo)
const docResponse = await fetch(`/documents/tracking/${masterId}`, {
  headers: { Authorization: 'Bearer token' },
});

const docData = await docResponse.json();
// Devolver al usuario la URL
return {
  ...shipments[0],
  labelUrl: docData.downloadUrl || 'queued-for-storage',
};
```

### 2. Descargar PDF Directamente

```typescript
// Descargar directamente desde frontend
window.location.href = `/documents/tracking/${masterId}/download?token=jwt_token`;
```

### 3. Listar Todos los PDFs de un Shipment

```typescript
const response = await fetch(`/documents/labels/${shipmentId}`, {
  headers: { Authorization: 'Bearer token' },
});

const labels = await response.json();
// Mostrar lista de PDFs disponibles
```

## Flujo Completo del Shipment

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario crea shipment via POST /shipping/create             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
       ┌───────────────────────────────┐
       │ API retorna shipmentId inmediato │
       │ (PDF marcado como "queued")     │
       └───────────┬───────────────────┘
                   │
                   │ (En background)
                   │ Bull Queue descarga PDF
                   │
                   ▼
       ┌───────────────────────────────┐
       │ PDF guardado en GridFS        │
       │ DocumentMetadata creado       │
       └───────────┬───────────────────┘
                   │
                   │ (Usuario solicita después)
                   │ GET /documents/tracking/{masterId}
                   │
                   ▼
       ┌───────────────────────────────┐
       │ Retorna metadata + downloadUrl │
       └───────────────────────────────┘
```

## Seguridad

✅ **Autenticación:** Todos los endpoints requieren JWT válido (`@UseGuards(JwtAuthGuard)`)

✅ **Encriptación:** Los PDFs están encriptados en GridFS (AES-256-GCM) y se descifran solo al descargar

✅ **Auditoría:** Cada descarga se registra en `accessLogs` de DocumentMetadata

✅ **Expiración:** Los PDFs pueden expirar automáticamente (configurable)

## Ejemplos cURL

### Obtener metadata del PDF

```bash
curl -X GET \
  'http://localhost:3000/documents/tracking/SHP344960121201' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...'
```

### Descargar PDF

```bash
curl -X GET \
  'http://localhost:3000/documents/tracking/SHP344960121201/download' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...' \
  -o label.pdf
```

### Listar todos los PDFs de un shipment

```bash
curl -X GET \
  'http://localhost:3000/documents/labels/SHP344960121201' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...'
```

## Integración con Frontend

### React Example

```typescript
import { useState, useEffect } from 'react';

export function ShipmentLabel({ masterId, token }) {
  const [label, setLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLabel = async () => {
      try {
        const res = await fetch(
          `/documents/tracking/${masterId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        setLabel(data.document);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLabel();
  }, [masterId, token]);

  if (loading) return <div>Cargando PDF...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!label) return <div>PDF no disponible aún</div>;

  return (
    <div>
      <h3>{label.fileName}</h3>
      <a
        href={`/documents/tracking/${masterId}/download`}
        target="_blank"
        rel="noopener noreferrer"
      >
        📥 Descargar PDF
      </a>
    </div>
  );
}
```

## Notas de Implementación

1. **Búsqueda por shipmentId:**
   - El método `getDocumentByTracking()` busca documentos donde `shipmentId` coincida con el tracking/master ID
   - En el caso de Paquete Express, usamos el `masterId` como `shipmentId` en DocumentMetadata

2. **Solo LABEL documents:**
   - Los endpoints se enfocan en PDFs de tipo LABEL (facturas de envío)
   - Para otros tipos de documentos, usar `/documents/shipment/:shipmentId`

3. **Flujo asincrónico:**
   - El PDF se genera en background via Bull Queue
   - La API retorna inmediatamente mientras el PDF se procesa
   - El usuario puede consultar el estado y descargar cuando esté listo

4. **GridFS Storage:**
   - Los PDFs se encriptan con AES-256-GCM
   - Se almacenan en MongoDB GridFS (storage provider configurable)
   - La ruta en GridFS: `documents/{shipmentId}/{type}/{timestamp}/{fileName}.enc`
