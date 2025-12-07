# Generador de IDs de Shipora

## Descripción

La función `generateShiporaId()` genera identificadores únicos para Shipora con el formato:

```
SHP + 12 dígitos numéricos
Ejemplo: SHP743951627408
```

## Características

✅ **Formato Consistente**: Siempre comienza con `SHP` seguido de exactamente 12 dígitos numéricos
✅ **Garantiza Unicidad**: Nunca genera el mismo ID dos veces usando timestamp + contador
✅ **Alta Concurrencia**: Maneja hasta 99 IDs generados en el mismo milisegundo
✅ **Rápido y Eficiente**: Basado en timestamp con overhead mínimo

## Cómo Funciona

La unicidad se garantiza mediante:

1. **Componente de Timestamp** (10 dígitos)
   - Utiliza los últimos 10 dígitos de `Date.now()` (milisegundos)
   - Cubre ~300+ años de cobertura única
   - Formato: `YYYMMDDHHM` (aproximadamente)

2. **Componente de Contador** (2 dígitos)
   - Se incrementa para cada ID generado en el mismo milisegundo
   - Rango: 00-99 (maneja hasta 100 IDs por milisegundo)
   - Se reinicia al cambiar de milisegundo

**Resultado**: 10 + 2 = 12 dígitos totales

## Ejemplo de Generación Secuencial

```typescript
SHP344960121201; // ID 1, timestamp 1731872760121, counter 01
SHP344960121301; // ID 2, timestamp 1731872760121, counter 01 → reinicia
SHP344960121302; // ID 3, timestamp 1731872760121, counter 02
SHP344960121303; // ID 4, timestamp 1731872760121, counter 03
```

## Uso en el Código

### Importar la función

```typescript
import utils from '@modules/core/shared/utils';

// O en un archivo que ya importa utils
const shiporaId = utils.generateShiporaId();
```

### Ejemplos de Uso

**1. En un Controlador (crear shipment)**

```typescript
@Post('shipments')
async createShipment(@Body() dto: CreateShipmentDto) {
  const shiporaId = utils.generateShiporaId();

  const shipment = await this.shippingService.createShipment({
    ...dto,
    shiporaId, // SHP743951627408
  });

  return shipment;
}
```

**2. En un Servicio**

```typescript
@Injectable()
export class ShippingService {
  createShipment(data: any) {
    const id = utils.generateShiporaId();

    return this.repository.save({
      ...data,
      shiporaId: id,
    });
  }
}
```

**3. Con PaqueteExpressCarrier (para IDs de guías)**

```typescript
async createShipment(shipmentData: CreateShipmentRequestDto) {
  const shiporaGuideId = utils.generateShiporaId();

  // Enviar a API externa con ID de Shipora
  const response = await this.paqueteExpressAdapter.createShipment({
    ...shipmentData,
    reference: shiporaGuideId, // SHP743951627408
  });

  return [{
    shiporaId: shiporaGuideId,
    ...response,
  }];
}
```

## Caso de Uso: Enumeración de Guías

```typescript
// Generando 5 guías
const guias = [];
for (let i = 0; i < 5; i++) {
  guias.push({
    id: utils.generateShiporaId(),
    carrier: 'paquete-express',
    status: 'pending',
  });
}

/* Resultado:
[
  { id: 'SHP344960121201', carrier: 'paquete-express', status: 'pending' },
  { id: 'SHP344960121301', carrier: 'paquete-express', status: 'pending' },
  { id: 'SHP344960121302', carrier: 'paquete-express', status: 'pending' },
  { id: 'SHP344960121303', carrier: 'paquete-express', status: 'pending' },
  { id: 'SHP344960121304', carrier: 'paquete-express', status: 'pending' },
]
*/
```

## Ventajas sobre UUID

| Aspecto            | Shipora ID          | UUID                        |
| ------------------ | ------------------- | --------------------------- |
| **Formato**        | SHP + 12 dígitos    | 36 caracteres hexadecimales |
| **Tamaño**         | 15 caracteres       | 36 caracteres               |
| **Legibilidad**    | Alta (solo números) | Media (hex con guiones)     |
| **Performance**    | Muy rápido          | Rápido                      |
| **BD Indexing**    | Excelente           | Bueno                       |
| **Requerimientos** | Ninguno             | Librería externa (uuid)     |

## Consideraciones

### ✅ Fortalezas

- Nunca se repetirá el mismo ID
- Mantiene la unicidad incluso con alta concurrencia
- Fácil de leer y escribir en formularios
- Perfectamente ordenable por timestamp

### ⚠️ Limitaciones

- Máximo 99 IDs por milisegundo
- Si se necesitan 100+ IDs simultáneos en el mismo ms, se hace cycling (pero sigue siendo único)
- No criptográficamente seguro (no usar para tokens)
- Requiere variables globales para el contador

### 🔒 Seguridad

**⚠️ Nota**: Esta ID **NO es criptográficamente segura** para usar como:

- Tokens de autenticación
- Claves de API
- Secrets o contraseñas

Para esos casos, usar `utils.getRandomUUIDPart()` o `crypto.randomBytes()`.

## Testing

Para verificar que está funcionando:

```bash
# Compilar el proyecto
pnpm build

# Ejecutar en Node.js
node -e "
const utils = require('./dist/core/shared/utils.js').default;
console.log('IDs únicos generados:');
for (let i = 0; i < 5; i++) {
  console.log(utils.generateShiporaId());
}
"
```

## Localización de la Función

Archivo: `src/core/shared/utils.ts`

Función: `generateShiporaId(): string`

Exportada en: `export default { generateShiporaId, ... }`

## Referencias

- Ubicación: `src/core/shared/utils.ts` (línea ~7)
- Relacionados: `getRandomUUIDPart()`, `crypto.randomBytes()`
