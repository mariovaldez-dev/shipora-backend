# 📄 Almacenamiento de PDFs Encriptados - Guía Completa

## 🎯 Comparativa de Opciones

### 1. Firebase Storage ☁️

**Pros:**

- ✅ Gratuito hasta 1GB/mes
- ✅ Excelente para desarrollo
- ✅ Autenticación integrada
- ✅ No requiere servidor
- ✅ Setup muy rápido (~30 min)
- ✅ Escalable automáticamente
- ✅ CDN global incluido

**Contras:**

- ❌ Límite de 1GB gratis
- ❌ Después: $0.18 por GB/mes
- ❌ Vendor lock-in
- ❌ Menos control sobre datos

**Costos:**

```
< 1 GB/mes:    $0.00
1 - 50 GB:     $0.18/GB
50 - 500 GB:   $0.16/GB
> 500 GB:      $0.12/GB

Ejemplo: 100 GB = $18/mes
```

**Ideal para:**

- MVP y desarrollo
- Apps pequeñas/medianas
- Prototipado rápido

---

### 2. AWS S3 🔧

**Pros:**

- ✅ Más barato en volúmenes altos
- ✅ Mayor control
- ✅ Menos vendor lock-in
- ✅ Integración con KMS (key management)
- ✅ Mejor para datos empresariales
- ✅ Integración con CloudFront (CDN)
- ✅ Auditoría completa (CloudTrail)

**Contras:**

- ❌ Setup más complejo
- ❌ Documentación densa
- ❌ Curva de aprendizaje mayor
- ❌ Requiere configuración IAM

**Costos:**

```
Primer 1 TB/mes:  $0.023/GB
Siguientes 4 TB:  $0.022/GB
Siguientes 100TB: $0.021/GB

Ejemplo: 100 GB = $2.30/mes
+ GET requests: $0.0004 por 10K requests
+ Data transfer out: $0.09/GB

Realista para 100GB con acceso: ~$15/mes
```

**Ideal para:**

- Apps medianas/grandes
- Alto volumen de datos
- Múltiples regiones
- Integración empresarial

---

### 3. Servidor Local 🖥️

**Pros:**

- ✅ Control total
- ✅ Cero costo de almacenamiento
- ✅ Sin vendor lock-in
- ✅ Latencia ultra-baja
- ✅ Privacidad máxima

**Contras:**

- ❌ Requiere infraestructura
- ❌ Mantenimiento manual
- ❌ Backups propios
- ❌ Escalabilidad limitada
- ❌ Costo de servidores
- ❌ Seguridad responsabilidad tuya

**Costos:**

```
Servidor dedicado:     $50-200/mes
Storage SSD extra:     $100-500/mes
Backups/redundancia:   $100-300/mes
Persona mantenimiento: $3000-5000/mes

Total: $3250-5800/mes para operación profesional
```

**Ideal para:**

- Datos críticos ultra-privados
- Cumplimiento regulatorio estricto
- Alto volumen sin presupuesto limitado

---

## 🏆 Recomendación

```
┌─────────────────────────────────────┐
│ PARA TU CASO (Shipora)              │
├─────────────────────────────────────┤
│                                     │
│ 🥇 PRIMERA OPCIÓN: AWS S3          │
│    └─ Mejor relación costo/control │
│    └─ Escalable sin preocupación   │
│    └─ KMS para encriptación        │
│    └─ Integración con NestJS      │
│                                     │
│ 🥈 SEGUNDA OPCIÓN: Firebase        │
│    └─ Si quieres algo rápido       │
│    └─ MVP o testing inicial        │
│    └─ Escalas después si es neces. │
│                                     │
│ 🥉 TERCERA OPCIÓN: Servidor Local  │
│    └─ NO recomendado para PDFs     │
│    └─ Mejor para otros datos       │
│                                     │
└─────────────────────────────────────┘
```

---

## 💡 Decisión

**Para Shipora recomiendo: AWS S3 + KMS**

**Razones:**

1. ✅ Escalable sin límites
2. ✅ Encriptación nativa (KMS)
3. ✅ Integración empresarial
4. ✅ Mejor ROI a largo plazo
5. ✅ Control y auditoría
6. ✅ Integración con CloudFront

---

## Implementación Comparada

### Opción A: AWS S3 (Recomendada)

```typescript
// Instalación
npm install @aws-sdk/client-s3 crypto

// Uso
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  }
});

// Guardar PDF encriptado
await putObject({
  Bucket: 'shipora-pdfs',
  Key: 'invoices/2025/invoice-001.pdf.enc',
  Body: encryptedPdfBuffer,
  ServerSideEncryption: 'aws:kms',
  SSEKMSKeyId: process.env.KMS_KEY_ID,
});

// Obtener y desencriptar
const data = await s3.send(new GetObjectCommand({
  Bucket: 'shipora-pdfs',
  Key: 'invoices/2025/invoice-001.pdf.enc',
}));
const decryptedPdf = decrypt(data.Body);
```

### Opción B: Firebase Storage

```typescript
// Instalación
npm install firebase-admin crypto

// Uso
const bucket = admin.storage().bucket();

// Guardar PDF encriptado
await bucket.file('invoices/2025/invoice-001.pdf.enc').save(
  encryptedPdfBuffer,
  { metadata: { metadata: { encrypted: 'true' } } }
);

// Obtener y desencriptar
const [pdfData] = await bucket.file('invoices/2025/invoice-001.pdf.enc').download();
const decryptedPdf = decrypt(pdfData);
```

---

## 🔐 Estrategia de Encriptación

### Algoritmo: AES-256-GCM

```
Ventajas:
✅ Estándar militar
✅ Autenticación integrada (GCM)
✅ Rápido en Node.js
✅ 256-bit = ultra-seguro
```

### Flujo

```
PDF Original
    ↓
Generar IV + Key
    ↓
AES-256-GCM Encrypt
    ↓
IV + AuthTag + Ciphertext
    ↓
Guardar en S3/Firebase
    ↓
─────────────────────────
    ↓
Recuperar de S3/Firebase
    ↓
IV + AuthTag + Ciphertext
    ↓
AES-256-GCM Decrypt
    ↓
PDF Original
```

### Código

```typescript
import crypto from 'crypto';

// Generar clave (hacer esto UNA SOLA VEZ y guardar seguro)
const encryptionKey = crypto.randomBytes(32); // 256 bits
console.log('Key (guardar en .env):', encryptionKey.toString('hex'));

// Encriptar
function encryptPdf(
  pdfBuffer: Buffer,
  key: Buffer,
): {
  iv: string;
  authTag: string;
  ciphertext: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(pdfBuffer), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

// Desencriptar
function decryptPdf(
  encryptedData: { iv: string; authTag: string; ciphertext: string },
  key: Buffer,
): Buffer {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
```

---

## Siguiente Paso

¿Cuál prefieres implementar?

1. **AWS S3** (recomendado - máximo control y escalabilidad)
2. **Firebase Storage** (rápido - para MVP)
3. **Ambas opciones** (implemento ambas y elige)

Dime y continuamos con la implementación detallada + código listo.
