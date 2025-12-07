# 🧪 Ejemplos de Uso del Caché

Colección de ejemplos listos para copiar y pegar para probar el sistema de caché.

## 1️⃣ Obtener Tarifas (Con Caché Automático)

### Primera Llamada (SIN caché - Será lento)

```bash
time curl -X POST "http://localhost:3000/shipping/paqueteexpress/rates" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {
      "country": "MX",
      "state": "CDMX",
      "city": "Ciudad de México",
      "municipality": "Cuauhtémoc",
      "colony": "Roma Norte",
      "street": "Calle Falsa",
      "number": "123",
      "phone": "5512345678",
      "zipCode": "06700",
      "clientName": "Empresa A",
      "addressType": "ORIGIN"
    },
    "to": {
      "country": "MX",
      "state": "JAL",
      "city": "Guadalajara",
      "municipality": "Zapopan",
      "colony": "Centro",
      "street": "Avenida Siempre Viva",
      "number": "456",
      "phone": "3312345678",
      "zipCode": "44100",
      "clientName": "Cliente B",
      "addressType": "DESTINATION"
    },
    "products": [
      {
        "sku": "SKU-001",
        "name": "Camiseta",
        "quantity": 2,
        "dimensions": {
          "length": 30,
          "width": 20,
          "height": 2,
          "weight": 0.3,
          "volume": 1200
        },
        "value": 500,
        "currency": "MXN",
        "requireAssurance": true
      }
    ],
    "userKey": "user-123"
  }'
```

**Tiempo esperado:** ~800ms ⏱️

### Segunda Llamada (CON caché - Será MUCHO más rápido)

Ejecuta exactamente el mismo comando anterior:

```bash
time curl -X POST "http://localhost:3000/shipping/paqueteexpress/rates" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {...},
    "to": {...},
    "products": [...],
    "userKey": "user-123"
  }'
```

**Tiempo esperado:** ~10-50ms ⚡ (16x más rápido)

---

## 2️⃣ Forzar Consulta sin Caché

Útil para obtener tarifas actualizadas o debugging:

```bash
curl -X POST "http://localhost:3000/shipping/paqueteexpress/rates?noCache=true" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {...},
    "to": {...},
    "products": [...],
    "userKey": "user-123"
  }'
```

**Siempre tardará:** ~800ms (consulta API directamente)

---

## 3️⃣ Comparar Tarifas Entre Carriers

### Con Todos los Carriers

```bash
time curl -X POST "http://localhost:3000/shipping/rates/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {
      "country": "MX",
      "state": "CDMX",
      "city": "Ciudad de México",
      "municipality": "Cuauhtémoc",
      "colony": "Roma Norte",
      "street": "Calle Falsa",
      "number": "123",
      "phone": "5512345678",
      "zipCode": "06700",
      "clientName": "Empresa A",
      "addressType": "ORIGIN"
    },
    "to": {
      "country": "MX",
      "state": "JAL",
      "city": "Guadalajara",
      "municipality": "Zapopan",
      "colony": "Centro",
      "street": "Avenida Siempre Viva",
      "number": "456",
      "phone": "3312345678",
      "zipCode": "44100",
      "clientName": "Cliente B",
      "addressType": "DESTINATION"
    },
    "products": [
      {
        "sku": "SKU-001",
        "name": "Camiseta",
        "quantity": 2,
        "dimensions": {
          "length": 30,
          "width": 20,
          "height": 2,
          "weight": 0.3,
          "volume": 1200
        },
        "value": 500,
        "currency": "MXN",
        "requireAssurance": true
      }
    ],
    "userKey": "user-123"
  }'
```

**Response esperada:**

```json
[
  {
    "carrier": "paqueteexpress",
    "rates": [...],
    "success": true,
    "source": "cache"
  },
  {
    "carrier": "fedex",
    "rates": [...],
    "success": true
  }
]
```

### Con Carriers Específicos

```bash
curl -X POST "http://localhost:3000/shipping/rates/compare?carriers=paqueteexpress,fedex" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Sin Caché (Obtener Tarifas Actualizadas)

```bash
curl -X POST "http://localhost:3000/shipping/rates/compare?noCache=true" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 4️⃣ Gestión del Caché

### Ver Estadísticas del Caché

```bash
curl http://localhost:3000/shipping/cache/stats
```

**Response:**

```json
{
  "type": "cache-manager",
  "status": "active"
}
```

### Limpiar TODO el Caché

```bash
curl -X DELETE http://localhost:3000/shipping/cache
```

**Response:**

```json
{
  "message": "Cache limpiado exitosamente",
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

### Limpiar Caché de un Carrier Específico

```bash
curl -X DELETE http://localhost:3000/shipping/cache/paqueteexpress
```

**Response:**

```json
{
  "message": "Cache del carrier paqueteexpress invalidado",
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

---

## 📊 Script de Testing (Bash)

Copia este script para automatizar pruebas de performance:

```bash
#!/bin/bash

# cache-test.sh

echo "🚀 Iniciando pruebas de caché..."
echo ""

# Datos del envío
SHIPMENT_DATA='{
  "from": {
    "country": "MX",
    "state": "CDMX",
    "city": "Ciudad de México",
    "municipality": "Cuauhtémoc",
    "colony": "Roma Norte",
    "street": "Calle Falsa",
    "number": "123",
    "phone": "5512345678",
    "zipCode": "06700",
    "clientName": "Empresa A",
    "addressType": "ORIGIN"
  },
  "to": {
    "country": "MX",
    "state": "JAL",
    "city": "Guadalajara",
    "municipality": "Zapopan",
    "colony": "Centro",
    "street": "Avenida Siempre Viva",
    "number": "456",
    "phone": "3312345678",
    "zipCode": "44100",
    "clientName": "Cliente B",
    "addressType": "DESTINATION"
  },
  "products": [
    {
      "sku": "SKU-001",
      "name": "Camiseta",
      "quantity": 2,
      "dimensions": {
        "length": 30,
        "width": 20,
        "height": 2,
        "weight": 0.3,
        "volume": 1200
      },
      "value": 500,
      "currency": "MXN",
      "requireAssurance": true
    }
  ],
  "userKey": "user-123"
}'

# Test 1: Primera llamada (sin caché)
echo "📌 Test 1: Primera llamada (sin caché)..."
echo "Esperado: ~800ms"
echo ""
time curl -s -X POST "http://localhost:3000/shipping/paqueteexpress/rates" \
  -H "Content-Type: application/json" \
  -d "$SHIPMENT_DATA" > /dev/null
echo ""
echo ""

# Test 2: Segunda llamada (CON caché)
echo "📌 Test 2: Segunda llamada (CON caché)..."
echo "Esperado: ~10-50ms"
echo ""
time curl -s -X POST "http://localhost:3000/shipping/paqueteexpress/rates" \
  -H "Content-Type: application/json" \
  -d "$SHIPMENT_DATA" > /dev/null
echo ""
echo ""

# Test 3: Tercera llamada sin caché
echo "📌 Test 3: Tercera llamada forzando actualización..."
echo "Esperado: ~800ms (sin caché)"
echo ""
time curl -s -X POST "http://localhost:3000/shipping/paqueteexpress/rates?noCache=true" \
  -H "Content-Type: application/json" \
  -d "$SHIPMENT_DATA" > /dev/null
echo ""
echo ""

# Test 4: Comparar múltiples carriers
echo "📌 Test 4: Comparar múltiples carriers..."
echo "Esperado: ~50-100ms (desde caché)"
echo ""
time curl -s -X POST "http://localhost:3000/shipping/rates/compare" \
  -H "Content-Type: application/json" \
  -d "$SHIPMENT_DATA" > /dev/null
echo ""
echo ""

echo "✅ Pruebas completadas"
```

**Cómo usarlo:**

```bash
chmod +x cache-test.sh
./cache-test.sh
```

---

## 🐛 Debugging

### Ver logs de caché

```bash
# Monitorear logs en tiempo real
npm run start:dev

# Deberías ver logs como:
# [CacheService] Cache HIT para paqueteexpress
# [CacheService] Cache MISS para paqueteexpress - consultando API
```

### Verificar si un dato está en caché

```bash
# Obtener sin caché y guardar respuesta 1
curl -s -X POST "http://localhost:3000/shipping/paqueteexpress/rates?noCache=true" \
  -H "Content-Type: application/json" \
  -d '{...}' > response1.json

# Esperar un poco
sleep 2

# Obtener CON caché y guardar respuesta 2
curl -s -X POST "http://localhost:3000/shipping/paqueteexpress/rates" \
  -H "Content-Type: application/json" \
  -d '{...}' > response2.json

# Comparar (deberían ser idénticas)
diff response1.json response2.json
# Sin output = son iguales ✅
```

---

## 📝 Checklist para Verificación

- [ ] Primera llamada tarda ~800ms
- [ ] Segunda llamada tarda ~10-50ms
- [ ] Con `?noCache=true` siempre tarda ~800ms
- [ ] El endpoint `/cache/stats` responde 200
- [ ] `DELETE /cache` limpia todo el caché
- [ ] `DELETE /cache/paqueteexpress` invalida carrier específico
- [ ] Comparar tarifas combina resultados del caché y API

---

## 📊 Comparación Visual

```
Sin Caché:     ███████████████████ (800ms)
Con Caché:     ██ (50ms)

Ahorro:        17 veces más rápido! ⚡
```
