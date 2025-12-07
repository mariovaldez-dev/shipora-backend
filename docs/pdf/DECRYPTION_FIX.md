# Solución: Error de Descifrado "Unable to authenticate data"

## 🔍 Problema Identificado

Al intentar descargar un PDF, el error indicaba:

```
"Decryption failed: Unsupported state or unable to authenticate data.
Data may have been tampered with."
```

Este error específico en AES-256-GCM significa que el `authTag` no coincide, lo que puede ocurrir si:

1. El buffer encriptado se corrompe
2. El IV o AuthTag se guardan incorrectamente
3. El buffer no encriptado se guarda en lugar del buffer encriptado

## ✅ Solución Implementada

### Problema Real Encontrado

En `document.service.ts`, el método `saveDocument()` estaba guardando el **buffer original** en lugar del **buffer encriptado**:

```typescript
// ❌ INCORRECTO - Guardaba el PDF original sin encriptar
await this.storageService.upload({
  key: storageKey,
  buffer: options.buffer, // ← Buffer ORIGINAL
  // ...
});
```

Cuando se intentaba descifrar posteriormente:

1. Se recuperaba el PDF original (no encriptado)
2. Se intentaba convertir a hex y descifrar
3. El authTag no coincidía porque no venía del mismo proceso de encriptación
4. Fallaba la autenticación GCM

### Correción Aplicada

```typescript
// ✅ CORRECTO - Guarda el buffer encriptado
const encryptedData = this.encryptionService.encrypt(options.buffer);

// Convertir el ciphertext hex a Buffer
const encryptedBuffer = Buffer.from(encryptedData.ciphertext, 'hex');

// Guardar el buffer encriptado
await this.storageService.upload({
  key: storageKey,
  buffer: encryptedBuffer, // ← Buffer ENCRIPTADO
  // ...
});

// Guardar metadatos de encriptación
const documentMetadata = new this.documentModel({
  // ...
  encryptionIv: encryptedData.iv, // Guardar IV
  encryptionAuthTag: encryptedData.authTag, // Guardar AuthTag
  // ...
});
```

## 🔐 Flujo Correcto de Encriptación/Desencriptación

```
GUARDANDO:
┌─────────────────────────────────────────────┐
│ PDF Original (Buffer)                       │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ EncryptionService.encrypt()                │
│ - Genera IV aleatorio                      │
│ - Crea cipher con aes-256-gcm              │
│ - Encripta el PDF                          │
│ - Obtiene AuthTag                          │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
        ▼                   ▼
   ┌─────────┐         ┌──────────────────┐
   │ Ciphertext│       │ IV + AuthTag     │
   │ (hex)     │       │ (guardados en DB)│
   └────┬──────┘       └──────────────────┘
        │
        ▼
 Convert hex to Buffer
        │
        ▼
   ┌──────────────┐
   │ Guardar en   │
   │ GridFS       │
   └──────────────┘


DESCARGANDO:
┌─────────────────────────────────────────────┐
│ Recuperar de GridFS (Buffer encriptado)    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         Convertir a hex
                 │
                 ▼
┌─────────────────────────────────────────────┐
│ EncryptionService.decrypt()                │
│ - Leer IV de DB                            │
│ - Leer AuthTag de DB                       │
│ - Crear decipher                           │
│ - setAuthTag(authTag)                      │
│ - Descifrar ciphertext                     │
│ - Validar autenticación (AuthTag)          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ PDF Original │
         │ (Buffer)     │
         └──────────────┘
```

## 🛠️ Cambios Realizados

### 1. `src/documents/services/document.service.ts`

**Método `saveDocument()`:**

```typescript
// ANTES: Guardaba buffer original
await this.storageService.upload({
  buffer: options.buffer, // ❌ Incorrecto
});

// AHORA: Guarda buffer encriptado
const encryptedBuffer = Buffer.from(encryptedData.ciphertext, 'hex');
await this.storageService.upload({
  buffer: encryptedBuffer, // ✅ Correcto
});
```

**Método `getDocument()`:**

- ✅ Agregada validación de buffer vacío
- ✅ Mejor manejo de errores

### 2. `src/documents/services/encryption.service.ts`

**Método `encrypt()`:**

- ✅ Agregada validación que `authTag.length === 16`
- ✅ Mejor detección de errores en encriptación

### 3. `src/documents/jobs/pdf-download.processor.ts`

**Método `handlePdfDownload()`:**

- ✅ Agregada validación que buffer no esté vacío
- ✅ Mejor logging de depuración

## 🧪 Validación

El flujo correcto fue validado con una prueba:

```
✅ Encriptación: Genera IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
✅ Desencriptación: Recupera IV, AuthTag, Ciphertext
✅ Validación GCM: AuthTag coincide
✅ Resultado: PDF original recuperado correctamente
```

## 📋 Pasos para Probar

1. **Crear un nuevo shipment:**

   ```bash
   POST /shipping/create
   ```

2. **Esperar 2-5 segundos** (Bull procesa el PDF)

3. **Descargar el PDF:**

   ```bash
   GET /documents/tracking/{masterId}/download
   ```

4. **Resultado esperado:**
   - Status: 200 OK
   - Content-Type: application/pdf
   - Body: PDF descifrado correctamente

## ⚠️ Causas Comunes de Errores GCM

| Error                    | Causa                   | Solución                                     |
| ------------------------ | ----------------------- | -------------------------------------------- |
| "Unable to authenticate" | IV/AuthTag no coinciden | Usar los mismos IV/AuthTag de encriptación   |
| "Decryption failed"      | Ciphertext corrupto     | Validar que se guarda el buffer correcto     |
| "Empty buffer"           | Buffer vacío            | Validar que el PDF se descarga completamente |
| "Invalid tag length"     | AuthTag incorrecto      | Asegurar que es exactamente 16 bytes         |

## 🔑 Claves para Recordar

1. **IV (Initialization Vector):** Generado aleatoriamente en cada encriptación, 16 bytes
2. **AuthTag:** Generado por el cipher después de finalizarlo, 16 bytes
3. **Ciphertext:** Los datos encriptados
4. **Todos deben coincidir:** Si cambias cualquiera, la desencriptación falla

## ✅ Estado

- [x] Problema identificado
- [x] Solución implementada
- [x] Validación agregada
- [x] Compilación exitosa
- [x] Listo para probar

**Próximo paso:** Crear nuevo shipment y validar que el PDF se descarga correctamente.
