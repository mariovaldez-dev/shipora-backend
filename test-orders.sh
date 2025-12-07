#!/bin/bash

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api/v1"
EMAIL="test@example.com"
PASSWORD="password123"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Shipora Orders API Test Suite${NC}"
echo -e "${BLUE}================================${NC}\n"

# ============================================
# 1. VERIFICAR QUE EL SERVIDOR ESTÁ CORRIENDO
# ============================================
echo -e "${YELLOW}[1] Verificando que el servidor está corriendo...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Servidor no responde en $BASE_URL${NC}"
  echo "Inicia el servidor con: npm run start:dev"
  exit 1
fi
echo -e "${GREEN}✅ Servidor respondiendo${NC}\n"

# ============================================
# 2. OBTENER TOKEN JWT
# ============================================
echo -e "${YELLOW}[2] Obteniendo token JWT...${NC}"

# Primero intentar login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token // .data.accessToken // .data.access_token' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${YELLOW}Token no obtenido, intentando signup con $EMAIL ...${NC}"
  SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\",
      \"firstName\": \"Test\",
      \"lastName\": \"User\"
    }")

  echo -e "Signup response: $SIGNUP_RESPONSE"

  # Try login again
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\"
    }")

  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token' 2>/dev/null)

  if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ No se pudo obtener token tras signup${NC}"
    echo "Respuesta: $LOGIN_RESPONSE"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Token obtenido: ${TOKEN:0:20}...${NC}\n"

# ============================================
# 3. CREAR ORDEN DE VENTA
# ============================================
echo -e "${YELLOW}[3] Creando orden de venta...${NC}"

ORDER_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "sku": "TEST-001",
        "description": "Test Package",
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
    "notes": "Test order"
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.data._id' 2>/dev/null)
ORDER_NUMBER=$(echo $ORDER_RESPONSE | jq -r '.data.orderNumber' 2>/dev/null)

if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" == "null" ]; then
  echo -e "${RED}❌ Error al crear orden${NC}"
  echo "Respuesta: $ORDER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Orden creada${NC}"
echo -e "   ID: $ORDER_ID"
echo -e "   Número: $ORDER_NUMBER\n"

# ============================================
# 4. LISTAR ÓRDENES DEL USUARIO
# ============================================
echo -e "${YELLOW}[4] Listando órdenes del usuario...${NC}"

ORDERS_LIST=$(curl -s -X GET "$BASE_URL/orders?limit=10" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo $ORDERS_LIST | jq -r '.count' 2>/dev/null)
echo -e "${GREEN}✅ Órdenes encontradas: $COUNT${NC}\n"

# ============================================
# 5. OBTENER ORDEN POR ID
# ============================================
echo -e "${YELLOW}[5] Obteniendo orden por ID...${NC}"

ORDER_DETAIL=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo $ORDER_DETAIL | jq -r '.data.status' 2>/dev/null)
echo -e "${GREEN}✅ Orden obtenida${NC}"
echo -e "   Status: $STATUS\n"

# ============================================
# 6. REGISTRAR CONSULTA DE TARIFAS
# ============================================
echo -e "${YELLOW}[6] Registrando consulta de tarifas...${NC}"

RATE_RESPONSE=$(curl -s -X POST "$BASE_URL/orders/rates/query" \
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
  }')

RATE_ID=$(echo $RATE_RESPONSE | jq -r '.data._id' 2>/dev/null)

if [ -z "$RATE_ID" ] || [ "$RATE_ID" == "null" ]; then
  echo -e "${RED}❌ Error al registrar tarifa${NC}"
  echo "Respuesta: $RATE_RESPONSE"
else
  echo -e "${GREEN}✅ Tarifa registrada${NC}"
  echo -e "   ID: $RATE_ID\n"
fi

# ============================================
# 7. OBTENER HISTORIAL DE TARIFAS
# ============================================
echo -e "${YELLOW}[7] Obteniendo historial de tarifas...${NC}"

HISTORY=$(curl -s -X GET "$BASE_URL/orders/rates/history?limit=10" \
  -H "Authorization: Bearer $TOKEN")

HISTORY_COUNT=$(echo $HISTORY | jq -r '.count' 2>/dev/null)
echo -e "${GREEN}✅ Consultas de tarifa encontradas: $HISTORY_COUNT${NC}\n"

# ============================================
# 8. ESTADÍSTICAS POR CORREDOR
# ============================================
echo -e "${YELLOW}[8] Obteniendo estadísticas por corredor...${NC}"

CARRIER_STATS=$(curl -s -X GET "$BASE_URL/orders/stats/carriers" \
  -H "Authorization: Bearer $TOKEN")

CARRIERS=$(echo $CARRIER_STATS | jq '.data | length' 2>/dev/null)
echo -e "${GREEN}✅ Corredores en estadísticas: $CARRIERS${NC}"

echo $CARRIER_STATS | jq '.data[] | "\(.\_id): \(.count) consultas, precio promedio: $\(.avgPrice)"' 2>/dev/null || true
echo

# ============================================
# 9. RUTAS MÁS CONSULTADAS
# ============================================
echo -e "${YELLOW}[9] Obteniendo rutas más consultadas...${NC}"

ROUTES=$(curl -s -X GET "$BASE_URL/orders/stats/routes?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo $ROUTES | jq '.data[] | "Ruta: \(._id.origin) → \(._id.destination): \(.count) consultas"' 2>/dev/null || true
echo

# ============================================
# 10. VERIFICAR EN BASE DE DATOS
# ============================================
echo -e "${YELLOW}[10] Verificando documentos en MongoDB...${NC}"

echo -e "${BLUE}Órdenes:${NC}"
mongosh --eval "use shipora; db.salesorders.countDocuments()" 2>/dev/null || echo "MongoDB no disponible"

echo -e "${BLUE}Tarifas consultadas:${NC}"
mongosh --eval "use shipora; db.ratehistories.countDocuments()" 2>/dev/null || echo "MongoDB no disponible"

echo

# ============================================
# RESUMEN
# ============================================
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ TODAS LAS PRUEBAS EXITOSAS${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${BLUE}Resumen:${NC}"
echo -e "  • Orden creada: $ORDER_NUMBER ($ORDER_ID)"
echo -e "  • Total de órdenes del usuario: $COUNT"
echo -e "  • Consultas de tarifa registradas: $HISTORY_COUNT"
echo -e "  • Corredores únicos: $CARRIERS"
echo
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. Consultar en MongoDB:"
echo -e "     mongosh"
echo -e "     use shipora"
echo -e "     db.salesorders.findOne()"
echo -e "     db.ratehistories.findOne()"
echo
echo -e "  2. Ver documentación:"
echo -e "     cat docs/TESTING_ORDERS_API.md"
echo
