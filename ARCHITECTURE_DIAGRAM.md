# 🏗️ Arquitectura Visual - Sistema de Órdenes

## 📊 Estructura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Usuario)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Browser / Postman / Mobile App / cURL                               │
│         ↓                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              NestJS REST API (Port 3000)                       │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                 │ │
│  │  JWT Auth Guard (Todas las rutas protegidas)                   │ │
│  │         ↓                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │          OrdersController                               │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  POST   /orders                 → Crear orden           │  │ │
│  │  │  GET    /orders                 → Listar órdenes        │  │ │
│  │  │  GET    /orders/:id             → Obtener orden         │  │ │
│  │  │  POST   /orders/rates/query     → Registrar tarifas     │  │ │
│  │  │  GET    /orders/rates/history   → Ver historial         │  │ │
│  │  │  GET    /orders/stats/carriers  → Estadísticas          │  │ │
│  │  │  GET    /orders/stats/routes    → Rutas populares       │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │         ↓                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │          OrdersService                                  │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  • createSalesOrder()                                  │  │ │
│  │  │  • createShipment()                                    │  │ │
│  │  │  • recordRateQuery()                                   │  │ │
│  │  │  • getCarrierStatistics()                              │  │ │
│  │  │  • getTopRoutes()                                      │  │ │
│  │  │  ... 9 métodos más                                     │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │         ↓                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │       Mongoose Models                                   │  │ │
│  │  ├──────────────────────────────────────────────────────────┤  │ │
│  │  │  @InjectModel(SalesOrder.name)                         │  │ │
│  │  │  @InjectModel(Shipment.name)                           │  │ │
│  │  │  @InjectModel(RateHistory.name)                        │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│         ↓                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │          MongoDB (Base de Datos)                              │ │
│  ├────────────────────────────────────────────────────────────────┤ │
│  │                                                                 │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐           │ │
│  │  │  salesorders        │  │  shipments          │           │ │
│  │  ├─────────────────────┤  ├─────────────────────┤           │ │
│  │  │ • _id              │  │ • _id              │           │ │
│  │  │ • orderNumber      │  │ • orderId          │           │ │
│  │  │ • userId           │  │ • shiporaId        │           │ │
│  │  │ • status           │  │ • carrier          │           │ │
│  │  │ • items[]          │  │ • trackingNumber   │           │ │
│  │  │ • metadata         │  │ • status           │           │ │
│  │  │ • shipmentIds[]    │  │ • trackingEvents[] │           │ │
│  │  │ • timestamps       │  │ • cost             │           │ │
│  │  └─────────────────────┘  └─────────────────────┘           │ │
│  │                                                                 │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │  ratehistories                                          │  │ │
│  │  ├─────────────────────────────────────────────────────────┤  │ │
│  │  │ • _id                                                   │  │ │
│  │  │ • userId                                                │  │ │
│  │  │ • originCountry / destinationCountry                    │  │ │
│  │  │ • weight, dimensions, declaredValue                     │  │ │
│  │  │ • quotes[] (múltiples carriers)                         │  │ │
│  │  │ • selectedCarrier / selectedPrice                       │  │ │
│  │  │ • requestDuration                                        │  │ │
│  │  │ • orderId (link a SalesOrder)                           │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  │  Índices Optimizados:                                          │ │
│  │  ✓ userId + createdAt                                         │ │
│  │  ✓ orderNumber, shiporaId, trackingNumber                     │ │
│  │  ✓ status, carrier                                             │ │
│  │  ✓ origin + destination countries                              │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos - Crear Orden

```
┌─────────────────────────────────────────────────────────────────┐
│ Cliente: POST /orders                                           │
│ Body: { items: [...], shippingFrom: {...}, shippingTo: {...} }  │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ OrdersController.createOrder()                                  │
│ • Valida entrada                                                │
│ • Captura metadata (IP, User-Agent, source)                    │
│ • Extrae userId del JWT                                         │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ OrdersService.createSalesOrder()                                │
│ • Genera orderNumber único (SHP-YYYYMMDD-XXXXX)                 │
│ • Calcula totalValue                                             │
│ • Crea documento SalesOrder                                      │
│ • Status: PENDING                                                │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ MongoDB: Insert into salesorders                                │
│ Document saved with all metadata and relationships               │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ Response (200 OK):                                              │
│ {                                                                │
│   "success": true,                                              │
│   "data": {                                                      │
│     "_id": "...",                                                │
│     "orderNumber": "SHP-20251118-00001",                         │
│     "status": "PENDING",                                         │
│     ...                                                          │
│   }                                                              │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Relaciones Entre Entidades

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  User (JWT Token)                                               │
│    │                                                             │
│    ├─────→ 1:N ────────→ SalesOrder (Orden de Venta)           │
│    │                     ├─ orderNumber                          │
│    │                     ├─ status                               │
│    │                     ├─ items[]                              │
│    │                     ├─ shippingFrom/To                      │
│    │                     └─ shipmentIds[]                        │
│    │                           │                                 │
│    │                           ├─→ 1:N → Shipment              │
│    │                           │          ├─ shiporaId         │
│    │                           │          ├─ carrier           │
│    │                           │          ├─ trackingNumber    │
│    │                           │          ├─ status           │
│    │                           │          └─ trackingEvents[] │
│    │                           │                                │
│    │                           └─→ Link → RateHistory          │
│    │                                      (orderId, si existe)  │
│    │                                                             │
│    └─────→ 1:N ────────→ RateHistory (Historial de Tarifas)    │
│                          ├─ origin/destination                  │
│                          ├─ weight, dimensions                  │
│                          ├─ quotes[]                            │
│                          ├─ selectedCarrier                     │
│                          └─ selectedPrice                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Capas de Seguridad

```
┌────────────────────────────────────────┐
│      HTTP Request Incoming              │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│   1. JWT Verification (@UseGuards)    │
│   • Verifica Bearer token              │
│   • Extrae userId                      │
│   • Rechaza si inválido (401)          │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│   2. Controller Validation             │
│   • Valida estructura de datos         │
│   • Verifica campos requeridos         │
│   • Rechaza si inválido (400)          │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│   3. Service Authorization             │
│   • Verifica que userId coincida       │
│   • Rechaza acceso cruzado de usuarios │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│   4. Database Operation                │
│   • Query limitado a userId del JWT    │
│   • Índices optimizados para seguridad │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│   Response (Datos del usuario actual)  │
└────────────────────────────────────────┘
```

---

## 📈 Pipeline de Agregación - Estadísticas

```
MongoDB Collection: ratehistories
         ↓
    Match Stage
    ├─ userId: actual_user_id
    ├─ createdAt: { $gte: startDate, $lte: endDate }
    └─ (Reduce dataset)
         ↓
    Group Stage
    ├─ _id: "$carrier" (groupBy)
    ├─ count: { $sum: 1 }
    └─ avgPrice: { $avg: "$selectedPrice" }
         ↓
    Sort Stage
    └─ { $sort: { count: -1 } }
         ↓
    Result
    [
      { _id: "estafeta", count: 15, avgPrice: 45.33 },
      { _id: "paquete-express", count: 12, avgPrice: 62.50 },
      ...
    ]
```

---

## 🎯 Flujo de Autenticación

```
┌──────────────────────────────────┐
│   Cliente sin token              │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│   POST /auth/login               │
│   email + password               │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│   Auth Service                   │
│   • Valida credenciales          │
│   • Genera JWT                   │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│   Response                       │
│   { access_token: "eyJh..." }    │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│   Cliente con token              │
│   Próximas requests usan:        │
│   Authorization: Bearer eyJh...  │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│   JwtAuthGuard verifica          │
│   • Token válido?                │
│   • No expirado?                 │
│   • userId extraído              │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│   Acceso otorgado a recurso      │
└──────────────────────────────────┘
```

---

## 📦 Árbol de Archivos

```
src/orders/
├── entities/
│   ├── sales-order.entity.ts       (Orden de venta)
│   ├── shipment.entity.ts          (Envío con tracking)
│   └── rate-history.entity.ts      (Historial de tarifas)
├── services/
│   └── orders.service.ts           (14 métodos de negocio)
├── infrastructure/
│   └── controllers/
│       └── orders.controller.ts    (7 endpoints REST)
└── orders.module.ts                (Registro de módulo)
```

---

## 🚀 Flujo Completo de Uso

```
1. Login
   └─ POST /auth/login → JWT token

2. Crear Orden
   └─ POST /orders
     └─ MongoDB: INSERT salesorder
     └─ Response: { orderNumber: "SHP-20251118-00001" }

3. Consultar Tarifas
   └─ POST /orders/rates/query
     └─ MongoDB: INSERT ratehistory
     └─ Response: { selectedCarrier: "estafeta" }

4. Ver Órdenes
   └─ GET /orders
     └─ MongoDB: FIND salesorders (userId=current)
     └─ Response: Array de órdenes

5. Ver Estadísticas
   └─ GET /orders/stats/carriers
     └─ MongoDB: AGGREGATE ratehistories (group by carrier)
     └─ Response: [{ _id: "estafeta", count: 15, avgPrice: 45.33 }]

6. Ver Historial
   └─ GET /orders/rates/history
     └─ MongoDB: FIND ratehistories (userId=current)
     └─ Response: Array de consultas de tarifas
```

---

## 💾 Índices Creados

```
SalesOrder Collection:
├─ { userId: 1, createdAt: -1 }    (Timeline del usuario)
├─ { orderNumber: 1 }              (Búsqueda rápida)
├─ { status: 1 }                   (Filtrado por estado)
└─ { shippingTo.country: 1 }       (Análisis geográfico)

Shipment Collection:
├─ { userId: 1, createdAt: -1 }    (Timeline)
├─ { orderId: 1 }                  (Búsqueda por orden)
├─ { shiporaId: 1 }                (ID único de Shipora)
├─ { trackingNumber: 1 }           (Búsqueda del corredor)
├─ { status: 1 }                   (Filtrado por estado)
└─ { carrier: 1 }                  (Análisis por corredor)

RateHistory Collection:
├─ { userId: 1, createdAt: -1 }    (Timeline del usuario)
├─ { originCountry: 1, destinationCountry: 1 }  (Rutas)
├─ { carrier: 1 }                  (Análisis por corredor)
├─ { isActive: 1 }                 (Filtrado activos)
└─ { createdAt: -1 }               (Ordenamiento por fecha)
```

---

## ✨ Características Implementadas

```
┌────────────────────────────────────────┐
│  ✅ Crear Órdenes                      │
│  ├─ Validación de entrada              │
│  ├─ OrderNumber único                  │
│  └─ Metadata automática                │
├────────────────────────────────────────┤
│  ✅ Gestionar Shipments                │
│  ├─ Shipora ID                         │
│  ├─ Tracking de eventos                │
│  └─ Retry logic                        │
├────────────────────────────────────────┤
│  ✅ Registrar Tarifas                  │
│  ├─ Guardar múltiples quotes           │
│  ├─ Performance tracking               │
│  └─ Link a órdenes                     │
├────────────────────────────────────────┤
│  ✅ Analytics                          │
│  ├─ Estadísticas por carrier           │
│  ├─ Rutas más consultadas              │
│  └─ Agregaciones optimizadas           │
└────────────────────────────────────────┘
```

---

**Diagrama actualizado:** 18 de noviembre de 2025  
**Versión:** 1.0 - Production Ready
