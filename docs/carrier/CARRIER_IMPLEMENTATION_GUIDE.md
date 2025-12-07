# Guía de Implementación de Nuevos Carriers (Paqueterías)

Esta guía te muestra cómo agregar un nuevo transportista al sistema de envíos de Shipora.

## 📋 Resumen del Proceso

El sistema usa el patrón **Strategy + Factory** para soportar múltiples carriers dinámicamente. Cada nuevo carrier se implementa cumpliendo la interfaz `IShippingCarrier` y se registra automáticamente en el módulo.

---

## 🚀 Pasos para Agregar un Nuevo Carrier

### 1️⃣ Crear la Interfaz del Adaptador

Crea un archivo adaptador en `src/carriers/infrastructure/adapters/`:

```typescript
// src/carriers/infrastructure/adapters/nuevo-carrier.adapter.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NuevoCarrierAdapter {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('NUEVO_CARRIER_API_URL');
    this.apiKey = this.configService.get<string>('NUEVO_CARRIER_API_KEY');
  }

  async fetchRates(request: any) {
    // Implementar la lógica para obtener tarifas de la API del carrier
    // Ejemplo:
    const response = await this.httpService.axiosRef.post(
      `${this.apiUrl}/rates`,
      request,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      },
    );
    return response.data;
  }

  async createShipment(request: any) {
    // Implementar la creación de envíos
  }

  async trackShipment(trackingNumber: string) {
    // Implementar rastreo
  }

  async cancelShipment(trackingNumber: string) {
    // Implementar cancelación
  }
}
```

### 2️⃣ Crear Modelos de Request/Response

Crea estructuras en `src/carriers/infrastructure/models/`:

```typescript
// src/carriers/infrastructure/models/request/nuevo-carrier/nuevo-carrier-rate.request.ts
export interface NuevoCarrierRateRequest {
  origin: {
    zipCode: string;
    city: string;
    state: string;
  };
  destination: {
    zipCode: string;
    city: string;
    state: string;
  };
  weight: number;
  // ... otros campos específicos del carrier
}
```

### 3️⃣ Crear Mappers

Crea mappers en `src/carriers/infrastructure/mappers/`:

```typescript
// src/carriers/infrastructure/mappers/nuevo-carrier/nuevo-carrier-rate.mapper.ts
import { AddressDto } from '@modules/shipping/application/dto/address.dto';
import { ProductDto } from '@modules/shipping/application/dto/product.dto';
import { ShipmentRate } from 'carrier.interface';

export const NuevoCarrierRateRequestMapper = (
  from: AddressDto,
  to: AddressDto,
  product: ProductDto,
): NuevoCarrierRateRequest => {
  return {
    origin: {
      zipCode: from.zipCode,
      city: from.city,
      state: from.state,
    },
    destination: {
      zipCode: to.zipCode,
      city: to.city,
      state: to.state,
    },
    weight: product.dimensions.weight,
    // ... mapear otros campos
  };
};

export const NuevoCarrierToRateResponseMapper = (
  apiResponse: any,
  product: ProductDto,
  from: AddressDto,
  to: AddressDto,
  masterRateId: string,
  userKey: string,
  carrierKey: string,
): ShipmentRate => {
  return {
    serviceName: apiResponse.serviceName,
    totalPrice: apiResponse.price,
    currency: apiResponse.currency || 'MXN',
    estimatedDelivery: new Date(apiResponse.deliveryDate),
  };
};
```

### 4️⃣ Crear la Implementación del Carrier

Crea la clase carrier en `src/carriers/implementations/`:

```typescript
// src/carriers/implementations/nuevo-carrier.carrier.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingCarrier,
  ShipmentRate,
  ShipmentDetails,
  TrackingInfo,
} from '../domain/carrier.interface';
import { NuevoCarrierAdapter } from '../infrastructure/adapters/nuevo-carrier.adapter';
import {
  NuevoCarrierRateRequestMapper,
  NuevoCarrierToRateResponseMapper,
} from '../infrastructure/mappers/nuevo-carrier/nuevo-carrier-rate.mapper';
import { GetRatesDto } from './get-rates.dto';
import utils from '@modules/core/shared/utils';

@Injectable()
export class NuevoCarrierCarrier implements IShippingCarrier {
  readonly strategyKey = 'nuevocarrier'; // ID único para este carrier
  private readonly logger = new Logger(NuevoCarrierCarrier.name);

  constructor(private readonly adapter: NuevoCarrierAdapter) {}

  async getRates(
    shipmentData: GetRatesDto,
    carrierKey: string,
  ): Promise<ShipmentRate[]> {
    const shipmentRates: ShipmentRate[] = [];
    const masterRateId = 'master-rate-nc-' + utils.getRandomUUIDPart();

    try {
      const { products, from, to, userKey } = shipmentData;

      for (const product of products) {
        const request = NuevoCarrierRateRequestMapper(from, to, product);
        const apiResponse = await this.adapter.fetchRates(request);
        const rate = NuevoCarrierToRateResponseMapper(
          apiResponse,
          product,
          from,
          to,
          masterRateId,
          userKey,
          carrierKey,
        );
        shipmentRates.push(rate);
      }

      return shipmentRates;
    } catch (error) {
      this.logger.error('Error al obtener tarifas de Nuevo Carrier', error);
      throw new Error('No se pudo obtener las tarifas de Nuevo Carrier.');
    }
  }

  async createShipment(shipmentData: any): Promise<ShipmentDetails> {
    this.logger.log('Creando envío en Nuevo Carrier');
    // Implementar lógica de creación de envío
    return {
      trackingNumber: 'NC987654321',
      labelUrl: 'url/to/label.pdf',
      totalPrice: 99.9,
    };
  }

  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    this.logger.log('Rastreando en Nuevo Carrier:', trackingNumber);
    // Implementar lógica de rastreo
    return { status: 'En tránsito', history: [] };
  }

  async cancelShipment(
    trackingNumber: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Cancelando en Nuevo Carrier:', trackingNumber);
    // Implementar lógica de cancelación
    return { success: true, message: 'Envío cancelado.' };
  }
}
```

### 5️⃣ Registrar el Carrier en el Módulo

Edita `src/shipping/shipping.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PaqueteExpressCarrier } from '../carriers/implementations/paquete-express.carrier';
import { NuevoCarrierCarrier } from '../carriers/implementations/nuevo-carrier.carrier'; // ← NUEVO
import { ShippingController } from './infrastructure/controllers/shipping.controller';
import { ShippingService } from '@modules/carriers/application/services/shipping.service';
import { ShippingCarrierFactory } from '@modules/carriers/application/factories/shipping-carrier.factory';
import { SHIPPING_CARRIER } from '@modules/carriers/domain/carrier.interface';
import { PaqueteExpressAdapter } from '@modules/carriers/insfrastructure/adapters/paqueteexpress.adapter';
import { NuevoCarrierAdapter } from '@modules/carriers/insfrastructure/adapters/nuevo-carrier.adapter'; // ← NUEVO
import { HttpModule } from '@nestjs/axios';

// ¡La magia de la escalabilidad está aquí!
// Para agregar un nuevo transportista, solo lo añades a este array.
const carrierImplementations = [
  PaqueteExpressCarrier,
  NuevoCarrierCarrier, // ← NUEVO
];

@Module({
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingCarrierFactory,
    PaqueteExpressAdapter,
    NuevoCarrierAdapter, // ← NUEVO
    ...carrierImplementations,
    {
      provide: SHIPPING_CARRIER,
      useFactory: (...carriers) => carriers,
      inject: carrierImplementations,
    },
  ],
  imports: [HttpModule],
})
export class ShippingModule {}
```

---

## 📝 Checklist para Agregar un Nuevo Carrier

- [ ] Crear archivo adaptador en `src/carriers/infrastructure/adapters/`
- [ ] Crear modelos de request/response en `src/carriers/infrastructure/models/`
- [ ] Crear mappers en `src/carriers/infrastructure/mappers/`
- [ ] Crear archivo de implementación del carrier en `src/carriers/implementations/`
- [ ] Importar el adaptador en `src/shipping/shipping.module.ts`
- [ ] Importar la implementación del carrier en `src/shipping/shipping.module.ts`
- [ ] Agregar la implementación al array `carrierImplementations`
- [ ] Configurar variables de entorno (API URLs, keys, etc.)
- [ ] Probar con curl:
  ```bash
  curl -X POST "http://localhost:3000/shipping/nuevocarrier/rates" \
    -H "Content-Type: application/json" \
    -d '{...}'
  ```

---

## 🔄 Cómo Funciona la Escalabilidad

1. **Factory Pattern**: `ShippingCarrierFactory` gestiona todos los carriers
2. **Dependency Injection**: Nest inyecta automáticamente todos los carriers registrados
3. **Strategy Pattern**: Cada carrier implementa `IShippingCarrier`
4. **Dynamic Resolution**: `getRatesFromMultipleCarriers()` compara tarifas entre carriers

### Ejemplo: Obtener tarifas de múltiples carriers

```bash
curl -X POST "http://localhost:3000/shipping/all-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "from": { ... },
    "to": { ... },
    "products": [ ... ],
    "userKey": "user-123"
  }'
```

Devuelve:

```json
[
  {
    "carrier": "paqueteexpress",
    "rates": [ ... ],
    "success": true
  },
  {
    "carrier": "nuevocarrier",
    "rates": [ ... ],
    "success": true
  }
]
```

---

## 🛠️ Herramientas y Configuración

### Variables de Entorno

Agrega a tu `.env`:

```env
# Nuevo Carrier
NUEVO_CARRIER_API_URL=https://api.nuevocarrier.com
NUEVO_CARRIER_API_KEY=your-api-key-here
NUEVO_CARRIER_TIMEOUT=5000
```

### Logging

Usa el logger de NestJS:

```typescript
this.logger.log('Mensaje de información');
this.logger.warn('Advertencia');
this.logger.error('Error', error);
this.logger.debug('Debug info');
```

---

## ✅ Pruebas

### Unit Test Example

```typescript
// src/carriers/implementations/__tests__/nuevo-carrier.carrier.spec.ts
import { Test } from '@nestjs/testing';
import { NuevoCarrierCarrier } from '../nuevo-carrier.carrier';
import { NuevoCarrierAdapter } from '../../infrastructure/adapters/nuevo-carrier.adapter';

describe('NuevoCarrierCarrier', () => {
  let carrier: NuevoCarrierCarrier;
  let adapter: NuevoCarrierAdapter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [NuevoCarrierCarrier, NuevoCarrierAdapter],
    }).compile();

    carrier = module.get<NuevoCarrierCarrier>(NuevoCarrierCarrier);
    adapter = module.get<NuevoCarrierAdapter>(NuevoCarrierAdapter);
  });

  it('should get rates successfully', async () => {
    // Arrange
    const shipmentData = {
      /* ... */
    };
    jest.spyOn(adapter, 'fetchRates').mockResolvedValue({
      /* ... */
    });

    // Act
    const rates = await carrier.getRates(shipmentData, 'nuevocarrier');

    // Assert
    expect(rates).toBeDefined();
  });
});
```

---

## 📚 Referencias

- **Interfaz Base**: `carrier.interface.ts`
- **Factory**: `src/carriers/application/factories/shipping-carrier.factory.ts`
- **Servicio**: `src/carriers/application/services/shipping.service.ts`
- **DTOs**: `src/shipping/application/dto/`

---

¡Felicidades! 🎉 Ahora tienes un nuevo carrier integrado y funcionando.
