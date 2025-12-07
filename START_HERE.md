# 🎬 INSTRUCCIONES DE PRUEBA - Comienza Aquí

## ⏱️ Tiempo Total: ~5 minutos

---

## 🚀 Paso 1: Verificar que MongoDB y Redis están corriendo

```bash
# Terminal 1: MongoDB
mongosh
# Si responde con > prompt, está corriendo
exit

# Terminal 1: Redis
redis-cli ping
# Debe responder: PONG
```

---

## 🚀 Paso 2: Iniciar el Backend

```bash
# Terminal 2: NestJS Backend
cd /Users/mariovaldezdev/projects/nestjs/shipora-backend

npm run start:dev
# Espera a ver: "Application is running on: http://localhost:3000"
```

---

## 🚀 Paso 3: Ejecutar Pruebas (30 segundos)

```bash
# Terminal 3: Ejecutar script de pruebas
cd /Users/mariovaldezdev/projects/nestjs/shipora-backend

./test-orders.sh
```

**Esto hace automáticamente:**

1. ✅ Verifica que el servidor está corriendo
2. ✅ Obtiene un token JWT
3. ✅ Crea una orden de venta
4. ✅ Lista todas las órdenes
5. ✅ Obtiene orden por ID
6. ✅ Registra consulta de tarifas
7. ✅ Obtiene historial de tarifas
8. ✅ Obtiene estadísticas por corredor
9. ✅ Obtiene rutas más consultadas
10. ✅ Verifica todo en MongoDB

---

## 📊 Resultado Esperado

```
================================
  Shipora Orders API Test Suite
================================

[1] Verificando que el servidor está corriendo...
✅ Servidor respondiendo

[2] Obteniendo token JWT...
✅ Token obtenido: eyJhbGciOiJI...

[3] Creando orden de venta...
✅ Orden creada
   ID: 67401234567890abcdef1234
   Número: SHP-20251118-00001

[4] Listando órdenes del usuario...
✅ Órdenes encontradas: 1

[5] Obteniendo orden por ID...
✅ Orden obtenida
   Status: PENDING

[6] Registrando consulta de tarifas...
✅ Tarifa registrada
   ID: 67401234567890abcdef5678

[7] Obteniendo historial de tarifas...
✅ Consultas de tarifa encontradas: 1

[8] Obteniendo estadísticas por corredor...
✅ Corredores en estadísticas: 2

[9] Obteniendo rutas más consultadas...
(output omitido)

[10] Verificando documentos en MongoDB...
✅ Órdenes: 1
✅ Tarifas consultadas: 1

================================
✅ TODAS LAS PRUEBAS EXITOSAS
================================

Resumen:
  • Orden creada: SHP-20251118-00001 (67401234567890abcdef1234)
  • Total de órdenes del usuario: 1
  • Consultas de tarifa registradas: 1
  • Corredores únicos: 2
```

---

## ✅ Verificación en MongoDB

```bash
# Conectar a MongoDB
mongosh

# Ir a base de datos
use shipora

# Ver órdenes creadas
db.salesorders.findOne()
# Debe mostrar documento con orderNumber, status, etc.

# Ver tarifas consultadas
db.ratehistories.findOne()
# Debe mostrar documento con quotes, selectedCarrier, etc.

# Ver shipments (vacío si no has creado)
db.shipments.find()

# Contar documentos
db.salesorders.countDocuments()    # Debe ser >= 1
db.ratehistories.countDocuments()  # Debe ser >= 1

# Ver índices
db.salesorders.getIndexes()
# Debe mostrar: userId_1_createdAt_-1, orderNumber_1, status_1, etc.
```

---

## 📮 Opción Alternativa: Usar Postman

1. Abre Postman
2. Click en "Import" (arriba a la izquierda)
3. Selecciona: `Shipora_Orders_API.postman_collection.json`
4. Click "Import"
5. En la colección, ve a "Auth" → "Login" → Click "Send"
6. Copia el token de la respuesta
7. Ve a "Environments" → "Shipora Local"
8. Pega el token en la variable `token`
9. Ahora puedes hacer click en cualquier request y "Send"

---

## 🐛 Solución de Problemas

### Error: "Servidor no responde"

```bash
# Asegúrate de que NestJS está corriendo
npm run start:dev
# Debe mostrar: Application is running on: http://localhost:3000
```

### Error: "MongoDB connection failed"

```bash
# Asegúrate que MongoDB está corriendo
mongosh
# Debe mostrar: >
```

### Error: "Redis connection failed"

```bash
# Asegúrate que Redis está corriendo
redis-cli ping
# Debe responder: PONG
```

### Error: "401 Unauthorized"

```bash
# El token no es válido, recrea uno nuevo
# Ejecuta test-orders.sh de nuevo
```

---

## 📖 Documentación Disponible

Después de verificar que funciona, lee estos archivos para más detalles:

| Archivo                       | Propósito                | Tiempo |
| ----------------------------- | ------------------------ | ------ |
| **QUICK_TEST.md**             | Guía rápida (3 opciones) | 5 min  |
| **IMPLEMENTATION_SUMMARY.md** | Detalles técnicos        | 10 min |
| **TESTING_ORDERS_API.md**     | Guía completa de pruebas | 30 min |
| **RESPONSE_EXAMPLES.md**      | Ejemplos reales          | 10 min |
| **ARCHITECTURE_DIAGRAM.md**   | Diagramas ASCII          | 10 min |
| **README_ORDERS_SYSTEM.md**   | Resumen ejecutivo        | 5 min  |

---

## 🎯 Qué Se Probó

```
✅ Crear orden de venta
   └─ Status: PENDING
   └─ OrderNumber: SHP-20251118-00001
   └─ Metadata capturada: IP, User-Agent

✅ Registrar consultas de tarifas
   └─ Multiple quotes guardados
   └─ Carrier selection tracked
   └─ Performance metrics

✅ Obtener estadísticas
   └─ Count por carrier
   └─ Average price
   └─ Top routes

✅ Seguridad
   └─ JWT authentication
   └─ Validación de entrada
   └─ User isolation
```

---

## 📊 Estructura de Datos Verificada

### SalesOrder Document

```javascript
{
  _id: ObjectId(...),
  orderNumber: "SHP-20251118-00001",
  userId: "user_...",
  status: "PENDING",
  metadata: {
    source: "API",
    ipAddress: "192.168.1.100",
    userAgent: "bash script"
  },
  items: [...],
  shippingFrom: {...},
  shippingTo: {...},
  shipmentIds: [],
  requestedAt: ISODate(...),
  createdAt: ISODate(...)
}
```

### RateHistory Document

```javascript
{
  _id: ObjectId(...),
  userId: "user_...",
  originCountry: "MX",
  destinationCountry: "US",
  weight: 0.5,
  quotes: [
    {
      carrier: "paquete-express",
      serviceName: "Express Overnight",
      estimatedDays: 1,
      price: 45.50,
      currency: "USD"
    },
    ...
  ],
  selectedCarrier: "estafeta",
  selectedPrice: 28.75,
  requestDuration: 245,
  createdAt: ISODate(...)
}
```

---

## 🎓 Ejemplos Rápidos

### Ver Token

```bash
# El token está guardado en token.txt (generado por test-orders.sh)
cat token.txt
```

### Hacer Request Manual

```bash
TOKEN=$(cat token.txt)

# Crear orden
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[...],"shippingFrom":{...},"shippingTo":{...}}'

# Ver órdenes
curl -X GET http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN"

# Ver estadísticas
curl -X GET http://localhost:3000/orders/stats/carriers \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✨ Resumen

```
✅ Sistema completamente implementado
✅ Código compilado exitosamente
✅ Documentación exhaustiva disponible
✅ Múltiples formas de probar
✅ Producción ready

Próximo paso: Lee QUICK_TEST.md para más detalles
```

---

**Hora de ejecución esperada:** 5 minutos  
**Dificultad:** 🟢 Muy fácil  
**Requisitos:** MongoDB, Redis, NestJS corriendo

¡Listo para empezar! 🚀
