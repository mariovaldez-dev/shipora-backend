# 🚀 Firebase PDF Storage - Quick Start Guide

## Setup en 5 Pasos

### 1️⃣ Obtén tus Credenciales Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **Service Accounts**
4. Haz clic en **Generate New Private Key**
5. Se descargará un archivo `JSON` con tus credenciales

### 2️⃣ Configura Variables de Entorno

```bash
# En .env, añade:

# Firebase Storage
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Encryption (generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your-32-byte-hex-key-here
```

**Generar ENCRYPTION_KEY:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia la salida en `ENCRYPTION_KEY`.

### 3️⃣ Compilar el Proyecto

```bash
pnpm build
```

### 4️⃣ Iniciar el Servidor

```bash
pnpm start
```

### 5️⃣ Listo! 🎉

Ahora tienes estos endpoints disponibles:

---

## 📝 API Endpoints

### Subir Documento

```bash
POST /documents/upload?shipmentId=123&type=LABEL&fileName=invoice.pdf

# Headers:
# Content-Type: application/pdf
# Authorization: Bearer {JWT_TOKEN}

# Body: PDF binario

# Response:
{
  "_id": "507f1f77bcf86cd799439011",
  "shipmentId": "123",
  "type": "LABEL",
  "storageProvider": "FIREBASE",
  "storagePath": "gs://bucket/documents/123/LABEL/2025-11-17.../invoice.pdf.enc",
  "encryptionIv": "abcd1234...",
  "encryptionAuthTag": "ef567890...",
  "fileName": "invoice.pdf",
  "fileSizeBytes": 102400,
  "status": "STORED",
  "createdAt": "2025-11-17T10:30:00Z"
}
```

### Descargar Documento (Desencriptado)

```bash
GET /documents/{documentId}/download

# Headers:
# Authorization: Bearer {JWT_TOKEN}

# Response: PDF binario desencriptado
```

### Obtener Metadatos

```bash
GET /documents/{documentId}/metadata

# Response:
{
  "_id": "507f1f77bcf86cd799439011",
  "shipmentId": "123",
  "type": "LABEL",
  "fileName": "invoice.pdf",
  "fileSizeBytes": 102400,
  "downloadCount": 2,
  "status": "STORED",
  "createdAt": "2025-11-17T10:30:00Z",
  "downloadedAt": "2025-11-17T15:45:00Z"
}
```

### Obtener URL Firmada (Acceso Directo)

```bash
GET /documents/{documentId}/signed-url?expiresInHours=24

# Response:
{
  "signedUrl": "https://storage.googleapis.com/bucket/documents/...?signature=...",
  "expiresAt": "2025-11-18T10:30:00Z"
}
```

### Obtener Todos los Documentos de un Envío

```bash
GET /documents/shipment/{shipmentId}

# Response:
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "type": "LABEL",
    "fileName": "label.pdf",
    "status": "STORED"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "type": "INVOICE",
    "fileName": "invoice.pdf",
    "status": "STORED"
  }
]
```

### Eliminar Documento

```bash
DELETE /documents/{documentId}

# Response: 204 No Content
```

---

## 🔐 Seguridad

### Encriptación (AES-256-GCM)

- ✅ Los PDFs se encriptan **antes** de subirlos a Firebase
- ✅ Cada PDF tiene su propio IV (vector de inicialización)
- ✅ Auth Tag previene tampering/corrupción
- ✅ Sólo se pueden desencriptar con `ENCRYPTION_KEY`

### Acceso

- ✅ Todos los endpoints requieren JWT válido
- ✅ Los documentos se guardan con `ACL: private`
- ✅ Se registran logs de acceso (IP, User Agent, timestamp)
- ✅ URLs firmadas expiran automáticamente

### Expiración

- ✅ Documentos pueden tener fecha de expiración
- ✅ Un job automático marca como EXPIRED los vencidos
- ✅ Se pueden eliminar manualmente

---

## 🛠 Configuración Avanzada

### Tipos de Documento Disponibles

```typescript
enum DocumentType {
  LABEL = 'LABEL', // Etiqueta de envío
  INVOICE = 'INVOICE', // Factura
  PROOF = 'PROOF', // Comprobante de entrega
  RECEIPT = 'RECEIPT', // Recibo
  CUSTOMS = 'CUSTOMS', // Documentos aduanales
}
```

### Estados de Documento

```typescript
enum DocumentStatus {
  PENDING = 'PENDING', // Esperando guardarse
  STORED = 'STORED', // Guardado exitosamente
  EXPIRED = 'EXPIRED', // Vencido
  DELETED = 'DELETED', // Eliminado
}
```

### Providers de Almacenamiento

```typescript
enum StorageProvider {
  FIREBASE = 'FIREBASE', // Firebase Storage
  S3 = 'S3', // AWS S3 (implementar después)
}
```

---

## 🧪 Testing Manual

### 1. Crear un JWT Token

```bash
# Usa el endpoint de login para obtener un token válido
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Subir un Documento de Prueba

```bash
# Generar un PDF de prueba
echo "%PDF-1.4\n%Hello World" > test.pdf

# Subir
curl -X POST \
  "http://localhost:3000/documents/upload?shipmentId=test-123&type=LABEL&fileName=test.pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/pdf" \
  --data-binary "@test.pdf"
```

### 3. Descargar el Documento

```bash
# Obtener ID del documento de la respuesta anterior
curl -X GET \
  "http://localhost:3000/documents/{documentId}/download" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o downloaded.pdf
```

---

## 📊 Estructura de Base de Datos

```
documents
├─ id (UUID)
├─ shipmentId (ObjectId)
├─ type (enum: LABEL, INVOICE, PROOF, RECEIPT, CUSTOMS)
├─ storageProvider (FIREBASE, S3)
├─ storagePath (gs://bucket/path/file.pdf.enc)
├─ storageUrl (signed URL temporal)
├─ encryptionAlgorithm (AES-256-GCM)
├─ encryptionIv (hex)
├─ encryptionAuthTag (hex)
├─ fileName
├─ fileSizeBytes
├─ mimeType
├─ expiresAt (nullable)
├─ downloadedAt (nullable)
├─ downloadCount
├─ accessLogs (array)
├─ status
├─ createdAt (indexed)
└─ updatedAt (indexed)
```

---

## 🚨 Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT_KEY must be valid JSON"

- ✅ Asegúrate que `FIREBASE_SERVICE_ACCOUNT_KEY` esté completo y entre comillas
- ✅ No debe estar en múltiples líneas en .env
- ✅ Valida el JSON con `jq` o similar

### Error: "ENCRYPTION_KEY must be exactly 32 bytes"

- ✅ Genera una nueva key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- ✅ Copia exactamente 64 caracteres hexadecimales
- ✅ No debe incluir espacios

### Error: "Decryption failed - Data may have been tampered with"

- ✅ Asegúrate que `ENCRYPTION_KEY` sea la misma que cuando se encriptó
- ✅ No cambies `ENCRYPTION_KEY` después de guardar documentos
- ✅ El archivo PDF no fue corrupto durante la descarga

### Firebase Connection Timeout

- ✅ Verifica credenciales en Firebase Console
- ✅ Asegúrate que Firebase Storage está habilitado en tu proyecto
- ✅ Revisa las reglas de seguridad de Firebase

---

## 📚 Próximos Pasos

- ✅ Implementar AWS S3 como alternativa
- ✅ Agregar soporte para otros formatos (Word, Excel, etc.)
- ✅ Implementar compresión de PDF antes de encriptar
- ✅ Agregar antivirus scan a los uploads
- ✅ Implementar versionado de documentos
- ✅ Agregar watermarking a PDFs

---

## 📞 Soporte

Para issues o preguntas:

1. Revisa los logs: `pnpm start`
2. Valida credenciales Firebase en Console
3. Verifica que `ENCRYPTION_KEY` esté correctamente configurada
4. Revisa la documentación: `/docs/pdf/PDF_STORAGE_ARCHITECTURE.md`
