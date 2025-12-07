# Testing Orders API - Guía Completa

## Resumen de lo que fue implementado

1. **SalesOrder Entity** - Almacena órdenes de venta con metadata y tracking
2. **Shipment Entity** - Registra shipments con tracking de estado y eventos
3. **RateHistory Entity** - Almacena consultas de tarifas para KPIs y billing
4. **OrdersService** - Lógica de negocio para gestionar órdenes, shipments y tarifas
5. **OrdersController** - Endpoints REST para crear y consultar órdenes
6. **OrdersModule** - Módulo NestJS que integra todo

## Requisitos Previos

### 1. Base de datos MongoDB corriendo

```bash
# Verificar que MongoDB está disponible
mongosh --version
```

### 2. Redis corriendo (para el job queue)

```bash
# Verificar que Redis está disponible
redis-cli ping
# Debe responder: PONG
```

### 3. Backend corriendo

```bash
cd /Users/mariovaldezdev/projects/nestjs/shipora-backend
npm run start:dev
# Debe mostrar: Application is running on: http://localhost:3000
```

### 4. Token JWT válido

Necesitas un token JWT para todas las peticiones (excepto login). Obtén uno así:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Guarda el `access_token` que recibes en la respuesta.

---

## Tests por Endpoints

### 1. Crear una Orden de Venta

**Endpoint:** `POST /orders`

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "ITEM-001",
        "description": "Paquete pequeño",
        "quantity": 1,
        "weight": 0.5,
        "length": 20,
        "width": 15,
        "height": 10,
        "value": 100
      }
    ],
    "shippingFrom": {
      "country": "MX",
      "city": "Mexico City",
      "state": "CDMX",
      "postalCode": "06600",
      "address": "Calle Principal 123",
      "personName": "John Doe",
      "email": "john@example.com",
      "phone": "+52 55 1234 5678"
    },
    "shippingTo": {
      "country": "US",
      "city": "Los Angeles",
      "state": "CA",
      "postalCode": "90001",
      "address": "123 Main St",
      "personName": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1 213 555 1234"
    },
    "metadata": {
      "source": "API"
    },
    "notes": "Handle with care - fragile items"
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "_id": "67401234567890abcdef1234",
    "orderNumber": "SHP-20251118-00001",
    "userId": "user_id_from_jwt",
    "userName": "test@example.com",
    "status": "PENDING",
    "metadata": {
      "source": "API",
      "ipAddress": "127.0.0.1",
      "userAgent": "curl/7.64.1"
    },
    "items": [...],
    "shippingFrom": {...},
    "shippingTo": {...},
    "shipmentIds": [],
    "requestedAt": "2025-11-18T10:30:45.123Z"
  },
  "message": "Order created successfully"
}
```

**Guarda el `_id` de la respuesta para uso en otros tests.**

---

### 2. Listar Órdenes del Usuario

**Endpoint:** `GET /orders?limit=50&skip=0`

```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:3000/orders?limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "67401234567890abcdef1234",
      "orderNumber": "SHP-20251118-00001",
      "status": "PENDING",
      ...
    }
  ],
  "count": 1
}
```

---

### 3. Obtener Orden por ID

**Endpoint:** `GET /orders/:id`

```bash
TOKEN="your_jwt_token_here"
ORDER_ID="67401234567890abcdef1234"  # Del paso 1

curl -X GET "http://localhost:3000/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. Registrar Consulta de Tarifas

**Endpoint:** `POST /orders/rates/query`

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/orders/rates/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originCountry": "MX",
    "originCity": "Mexico City",
    "destinationCountry": "US",
    "destinationCity": "Los Angeles",
    "weight": 0.5,
    "length": 20,
    "width": 15,
    "height": 10,
    "declaredValue": 100,
    "requestDuration": 245,
    "quotes": [
      {
        "carrier": "paquete-express",
        "serviceName": "Express Overnight",
        "estimatedDays": 1,
        "price": 45.50,
        "currency": "USD"
      },
      {
        "carrier": "estafeta",
        "serviceName": "Standard",
        "estimatedDays": 3,
        "price": 28.75,
        "currency": "USD"
      }
    ]
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "_id": "67401234567890abcdef5678",
    "userId": "user_id_from_jwt",
    "originCountry": "MX",
    "destinationCountry": "US",
    "weight": 0.5,
    "quotes": [
      {
        "carrier": "paquete-express",
        "serviceName": "Express Overnight",
        "estimatedDays": 1,
        "price": 45.5,
        "currency": "USD"
      },
      {
        "carrier": "estafeta",
        "serviceName": "Standard",
        "estimatedDays": 3,
        "price": 28.75,
        "currency": "USD"
      }
    ],
    "requestDuration": 245,
    "isActive": true,
    "createdAt": "2025-11-18T10:35:20.456Z"
  },
  "message": "Rate query recorded"
}
```

**Guarda el `_id` para el siguiente test.**

---

### 5. Obtener Historial de Tarifas (para KPIs)

**Endpoint:** `GET /orders/rates/history?limit=100&skip=0`

```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:3000/orders/rates/history?limit=50&skip=0" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 6. Obtener Estadísticas por Corredor

**Endpoint:** `GET /orders/stats/carriers?startDate=2024-01-01&endDate=2024-12-31`

```bash
TOKEN="your_jwt_token_here"

# Últimos 30 días (si no especificas dates)
curl -X GET "http://localhost:3000/orders/stats/carriers" \
  -H "Authorization: Bearer $TOKEN"

# Con rango específico
curl -X GET "http://localhost:3000/orders/stats/carriers?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "paquete-express",
      "count": 5,
      "avgPrice": 42.3,
      "totalVolume": 5
    },
    {
      "_id": "estafeta",
      "count": 3,
      "avgPrice": 35.5,
      "totalVolume": 3
    }
  ]
}
```

---

### 7. Obtener Rutas Más Consultadas

**Endpoint:** `GET /orders/stats/routes?limit=10`

```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:3000/orders/stats/routes?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": [
    {
      "_id": {
        "origin": "MX",
        "destination": "US"
      },
      "count": 8,
      "avgPrice": 38.75,
      "avgDays": 2
    }
  ]
}
```

---

## Verificaciones de Base de Datos

### Conectar a MongoDB

```bash
mongosh
```

### Ver órdenes creadas

```javascript
use shipora  // o tu nombre de base de datos
db.salesorders.find().pretty()
```

### Ver shipments

```javascript
db.shipments.find().pretty();
```

### Ver historial de tarifas

```javascript
db.ratehistories.find().pretty();
```

### Verificar índices

```javascript
db.salesorders.getIndexes();
db.shipments.getIndexes();
db.ratehistories.getIndexes();
```

---

## Flujo Completo de Prueba (Integración)

### Paso 1: Obtener Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq '.access_token' -r > token.txt

TOKEN=$(cat token.txt)
echo "Token: $TOKEN"
```

### Paso 2: Crear Orden

```bash
TOKEN=$(cat token.txt)

ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"sku": "TEST-001", "quantity": 1, "weight": 0.5, "value": 50}],
    "shippingFrom": {
      "country": "MX", "city": "Mexico City", "state": "CDMX",
      "postalCode": "06600", "address": "Calle 123", "personName": "John",
      "email": "john@test.com", "phone": "+52 55 1234 5678"
    },
    "shippingTo": {
      "country": "US", "city": "Los Angeles", "state": "CA",
      "postalCode": "90001", "address": "123 Main", "personName": "Jane",
      "email": "jane@test.com", "phone": "+1 213 555 1234"
    },
    "metadata": {"source": "API"}
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq '._id' -r)
echo "Order created: $ORDER_ID"
```

### Paso 3: Registrar Tarifas

```bash
TOKEN=$(cat token.txt)

curl -X POST http://localhost:3000/orders/rates/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originCountry": "MX",
    "destinationCountry": "US",
    "weight": 0.5,
    "quotes": [
      {"carrier": "paquete-express", "serviceName": "Express", "estimatedDays": 1, "price": 45, "currency": "USD"},
      {"carrier": "estafeta", "serviceName": "Standard", "estimatedDays": 3, "price": 28, "currency": "USD"}
    ]
  }'
```

### Paso 4: Ver Órdenes del Usuario

```bash
TOKEN=$(cat token.txt)

curl -X GET "http://localhost:3000/orders?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Paso 5: Ver Estadísticas

```bash
TOKEN=$(cat token.txt)

echo "=== Estadísticas por Corredor ==="
curl -X GET "http://localhost:3000/orders/stats/carriers" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n=== Rutas Más Consultadas ==="
curl -X GET "http://localhost:3000/orders/stats/routes?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Usando Postman (Recomendado)

### Crear Environment

1. Abre Postman
2. Click en "Environments" → "Create New Environment"
3. Nombre: "Shipora Local"
4. Variables:
   ```
   base_url: http://localhost:3000
   token: {{TOKEN}}
   ```

### Crear Collection

1. "New" → "Collection" → "Orders API Tests"
2. Agregar requests como se muestra arriba

### Autenticación

En cada request:

- Header: `Authorization: Bearer {{token}}`
- O usa Postman Auth Tab con "Bearer Token"

---

## Validaciones que Hace el Sistema

### En Crear Orden:

- ✅ Items array no puede estar vacío
- ✅ shippingFrom y shippingTo son requeridos
- ✅ Se genera orderNumber único con formato SHP-YYYYMMDD-XXXXX
- ✅ Se captura IP, User-Agent, Referer del request
- ✅ Se registra userId del JWT
- ✅ Se crea con status PENDING

### En Consulta de Tarifas:

- ✅ Quotes array no puede estar vacío
- ✅ originCountry y destinationCountry son requeridos
- ✅ Se registra duración de la consulta
- ✅ Se guarda metadata del usuario (IP, User-Agent)

### Índices de Base de Datos:

- ✅ SalesOrder: userId+createdAt, orderNumber, status, destination
- ✅ Shipment: userId+createdAt, orderId, shiporaId, trackingNumber, status
- ✅ RateHistory: userId+createdAt, origin+destination, carrier, isActive

---

## Troubleshooting

### Error: "401 Unauthorized"

- Verifica que el token sea válido
- Recrea un token nuevo con login

### Error: "Order not found"

- El ID puede no existir o ser del usuario incorrecto
- Verifica en MongoDB que el documento exista

### Error: "MongoDB connection failed"

- Asegúrate que MongoDB está corriendo: `mongosh`
- Revisa las credenciales en `.env`

### Datos no aparecen en estadísticas

- Las estadísticas usan agregaciones de MongoDB
- Puede tomar segundos en procesarse
- Verifica que hay suficientes datos en ratehistories

---

## Próximos Pasos (Funcionalidades Pendientes)

1. **Integración con Shipping Service**
   - Llamar `ordersService.createSalesOrder()` cuando se crea un shipment
   - Llamar `ordersService.createShipment()` después de generar label

2. **Actualización de Estados**
   - Cuando el carrier reporta pickup: actualizar shipment status
   - Cuando el carrier reporta delivery: actualizar shipment status

3. **Webhook Handlers**
   - Crear endpoints para webhooks de carriers
   - Actualizar status automáticamente

4. **Reports & Analytics**
   - Dashboard de KPIs
   - Revenue por carrier
   - Shipment success rates
   - Geographic distribution
