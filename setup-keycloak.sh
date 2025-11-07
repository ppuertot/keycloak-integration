#!/bin/bash

# Script de configuración de Keycloak
# Este script configura automáticamente un realm, cliente y usuarios de prueba

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin123"
REALM_NAME="myapp-realm"
CLIENT_ID="myapp-client"
CLIENT_SECRET="myapp-secret-key-12345"

echo "Esperando a que Keycloak esté disponible..."
until $(curl --output /dev/null --silent --head --fail ${KEYCLOAK_URL}); do
    printf '.'
    sleep 5
done
echo ""
echo "Keycloak está activo!"

# Obtener token de administrador
echo "Obteniendo token de administrador..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
    echo "Error: No se pudo obtener el token de administrador"
    exit 1
fi

echo "Token obtenido exitosamente"

# Crear Realm
echo "Creando realm '${REALM_NAME}'..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "'${REALM_NAME}'",
    "enabled": true,
    "registrationAllowed": true,
    "registrationEmailAsUsername": false,
    "rememberMe": true,
    "verifyEmail": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false,
    "bruteForceProtected": true
  }'

echo "Realm creado"

# Crear Cliente
echo "Creando cliente '${CLIENT_ID}'..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'${CLIENT_ID}'",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "secret": "'${CLIENT_SECRET}'",
    "redirectUris": ["http://localhost:3000/*", "http://localhost:4000/*"],
    "webOrigins": ["http://localhost:3000", "http://localhost:4000"],
    "protocol": "openid-connect",
    "publicClient": false,
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": false,
    "fullScopeAllowed": true
  }'

echo "Cliente creado"

# Crear roles
echo "Creando roles..."
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "user", "description": "Usuario estándar"}'

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "admin", "description": "Administrador"}'

echo "Roles creados"

# Crear usuario de prueba 1
echo "Creando usuario de prueba (user1)..."
USER1_ID=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "email": "user1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "enabled": true,
    "emailVerified": true
  }' -i | grep -oP '(?<=users/)[a-f0-9-]+')

# Establecer contraseña para user1
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${USER1_ID}/reset-password" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "password",
    "value": "password123",
    "temporary": false
  }'

# Asignar rol user a user1
USER_ROLE_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/user" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq -r '.id')

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${USER1_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[{"id": "'${USER_ROLE_ID}'", "name": "user"}]'

echo "Usuario user1 creado"

# Crear usuario administrador
echo "Creando usuario administrador (admin-user)..."
ADMIN_USER_ID=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin-user",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "enabled": true,
    "emailVerified": true
  }' -i | grep -oP '(?<=users/)[a-f0-9-]+')

# Establecer contraseña para admin-user
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${ADMIN_USER_ID}/reset-password" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "password",
    "value": "admin123",
    "temporary": false
  }'

# Asignar rol admin a admin-user
ADMIN_ROLE_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/admin" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq -r '.id')

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${ADMIN_USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[{"id": "'${ADMIN_ROLE_ID}'", "name": "admin"}]'

echo "Usuario admin-user creado"

echo ""
echo "=========================================="
echo "Configuración completada exitosamente!"
echo "=========================================="
echo ""
echo "Información de acceso:"
echo "----------------------"
echo "Keycloak Admin Console: ${KEYCLOAK_URL}/admin"
echo "Admin User: ${ADMIN_USER}"
echo "Admin Password: ${ADMIN_PASSWORD}"
echo ""
echo "Realm: ${REALM_NAME}"
echo "Client ID: ${CLIENT_ID}"
echo "Client Secret: ${CLIENT_SECRET}"
echo ""
echo "Usuarios de prueba:"
echo "  - Username: user1, Password: password123 (rol: user)"
echo "  - Username: admin-user, Password: admin123 (rol: admin)"
echo ""
echo "Endpoint de configuración:"
echo "${KEYCLOAK_URL}/realms/${REALM_NAME}/.well-known/openid-configuration"
echo "=========================================="
