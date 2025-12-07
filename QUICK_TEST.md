# Guía Rápida de Pruebas - Orders API

## 📋 Opción 1: Script Automático (Más Rápido)

```bash
# Ir a la carpeta del proyecto
cd /Users/mariovaldezdev/projects/nestjs/shipora-backend

# Ejecutar el script de pruebas
./test-orders.sh
```

**Esto hace automáticamente:**
✅ Verifica que el servidor esté corriendo  
✅ Obtiene un token JWT  
✅ Crea una orden de venta  
✅ Lista todas las órdenes  
✅ Obtiene una orden por ID  
✅ Registra una consulta de tarifas  
✅ Obtiene el historial de tarifas  
✅ Obtiene estadísticas por corredor  
✅ Obtiene rutas más consultadas  
✅ Verifica los datos en MongoDB

---

## 🚀 Opción 2: Manual con cURL

### Paso 1: Inicia el servidor

```bash
cd /Users/mariovaldezdev/projects/nestjs/shipora-backend
npm run start:dev
```

Espera a ver: `Application is running on: http://localhost:3000`

### Paso 2: Obtén un token JWT

```bash
# En otra terminal:
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.access_token')

echo $TOKEN
```

### Paso 3: Crea una orden

```bash
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"sku":"TEST-001","quantity":1,"weight":0.5,"value":50}],
    "shippingFrom":{"country":"MX","city":"Mexico City","state":"CDMX","postalCode":"06600","address":"Calle 123","personName":"John","email":"john@test.com","phone":"+52 55 1234 5678"},
    "shippingTo":{"country":"US","city":"Los Angeles","state":"CA","postalCode":"90001","address":"123 Main","personName":"Jane","email":"jane@test.com","phone":"+1 213 555 1234"},
    "metadata":{"source":"API"}
  }' | jq
```

### Paso 4: Lista órdenes

```bash
curl -X GET "http://localhost:3000/orders?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Paso 5: Registra tarifas

```bash
curl -X POST http://localhost:3000/orders/rates/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originCountry":"MX",
    "destinationCountry":"US",
    "weight":0.5,
    "quotes":[
      {"carrier":"paquete-express","serviceName":"Express","estimatedDays":1,"price":45,"currency":"USD"},
      {"carrier":"estafeta","serviceName":"Standard","estimatedDays":3,"price":28,"currency":"USD"}
    ]
  }' | jq
```

### Paso 6: Ver estadísticas

```bash
# Estadísticas por corredor
curl -X GET "http://localhost:3000/orders/stats/carriers" \
  -H "Authorization: Bearer $TOKEN" | jq

# Rutas más consultadas
curl -X GET "http://localhost:3000/orders/stats/routes?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📮 Opción 3: Postman (Más Fácil para UI)

### Importar la Colección

1. **Abre Postman**

2. **Click en "Import"** en la esquina superior izquierda

3. **Selecciona "Upload Files"**

4. **Elige el archivo:**

   ```
   Shipora_Orders_API.postman_collection.json
   ```

5. **Click en "Import"**

### Configurar Environment

1. **Click en "Environments"** en el lado izquierdo

2. **Click en "Create"** o **"New Environment"**

3. **Nombre:** `Shipora Local`

4. **Variables:**

   ```
   base_url    | http://localhost:3000
   token       | (vacío, se llenará después)
   order_id    | (vacío, se llenará después)
   ```

5. **Save**

### Ejecutar Requests

1. **En la colección, haz click en "Login"**
   - Verás los campos de email y password
   - Click en "Send"
   - Copia el `access_token` de la respuesta

2. **Configura el token en Environment**
   - Click en "Environments" → "Shipora Local"
   - Pega el token en la variable `token`
   - Click en "Save"

3. **Ahora puedes usar todas las requests**
   - Create Order
   - List Orders
   - Record Rate Query
   - Get Statistics
   - etc.

---

## 🔍 Verificar en MongoDB

### Abre MongoDB

```bash
mongosh
```

### Navega a la base de datos

```javascript
use shipora
```

### Ver órdenes creadas

```javascript
db.salesorders.find().pretty();
```

### Ver tarifas consultadas

```javascript
db.ratehistories.find().pretty();
```

### Ver shipments (cuando los crees)

```javascript
db.shipments.find().pretty();
```

### Contar documentos

```javascript
db.salesorders.countDocuments();
db.ratehistories.countDocuments();
```

### Ver índices (verificar que se crearon correctamente)

```javascript
db.salesorders.getIndexes();
db.ratehistories.getIndexes();
```

---

## ✅ Checklist de Verificación

Después de ejecutar las pruebas, verifica esto:

- [ ] ✅ El script `test-orders.sh` ejecutó sin errores
- [ ] ✅ Se creó al menos una orden con orderNumber `SHP-YYYYMMDD-XXXXX`
- [ ] ✅ El status de la orden es `PENDING`
- [ ] ✅ Se guardó la metadata (IP, User-Agent, source)
- [ ] ✅ Se registraron consultas de tarifas con múltiples quotes
- [ ] ✅ Las estadísticas por corredor muestran datos agregados
- [ ] ✅ Las rutas consultadas aparecen con count y precios
- [ ] ✅ En MongoDB se ven todos los documentos en sus colecciones

### Si algo falla:

**Error: "401 Unauthorized"**
→ Verifica que el token sea válido: `echo $TOKEN`

**Error: "Order not found"**
→ Verifica que el ORDER_ID sea correcto en MongoDB

**Error: "MongoDB connection failed"**
→ Asegúrate de que MongoDB está corriendo: `mongosh`

**Error: "Cannot GET /health"**
→ El servidor no está corriendo. Ejecuta: `npm run start:dev`

---

## 📊 Flujo Completo de Datos

```
1. Usuario hace login
   ↓
2. Recibe JWT token
   ↓
3. Crea una orden (POST /orders)
   ↓
4. Se guarda SalesOrder en MongoDB
   ↓
5. Se captura metadata (IP, User-Agent, source)
   ↓
6. Usuario consulta tarifas (POST /orders/rates/query)
   ↓
7. Se guarda RateHistory en MongoDB
   ↓
8. Usuario solicita estadísticas (GET /orders/stats/carriers)
   ↓
9. Se agregan datos de RateHistory
   ↓
10. Usuario ve KPIs (revenue, rutas, carriers)
```

---

## 🎯 Qué Prueba Cada Endpoint

| Endpoint                 | Método | Propósito                     |
| ------------------------ | ------ | ----------------------------- |
| `/auth/login`            | POST   | Obtener JWT token             |
| `/orders`                | POST   | Crear orden de venta          |
| `/orders`                | GET    | Listar órdenes del usuario    |
| `/orders/:id`            | GET    | Obtener orden específica      |
| `/orders/rates/query`    | POST   | Registrar consulta de tarifas |
| `/orders/rates/history`  | GET    | Obtener historial de tarifas  |
| `/orders/stats/carriers` | GET    | Estadísticas por corredor     |
| `/orders/stats/routes`   | GET    | Rutas más consultadas         |

---

## 💡 Próximas Integraciones

Una vez verificado que todo funciona, estos son los próximos pasos:

1. **Integrar con Shipping Service**
   - Cuando se crea un shipment, guardar en SalesOrder y Shipment

2. **Integrar con Carriers**
   - Guardar tracking numbers automáticamente

3. **Webhooks de Carriers**
   - Actualizar shipment status cuando hay cambios

4. **Dashboard de KPIs**
   - Mostrar gráficos con datos de las estadísticas

5. **Billing Reports**
   - Generar reportes de ingresos por carrier/ruta

---

## 📚 Documentación Completa

Para más detalles, ver: `docs/TESTING_ORDERS_API.md`
