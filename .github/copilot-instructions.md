# Keycloak OAuth2 Integration - AI Agent Instructions

## Project Overview
Full-stack OAuth2 authentication demo using Keycloak, Express.js backend, and Next.js frontend. Implements the OAuth2 Authorization Code flow with token introspection for authorization.

## Architecture

### Authentication Flow (Critical)
1. User clicks login → redirects to `backend/routes/auth.js:/auth/login`
2. Backend redirects to Keycloak with state cookie for CSRF protection
3. User authenticates **directly in Keycloak** (never in our app)
4. Keycloak returns authorization code to `/auth/callback`
5. Backend exchanges code for tokens (access, refresh, id)
6. Refresh token stored in httpOnly cookie, access token passed to frontend
7. Frontend stores access token in sessionStorage

**Key distinction**: Backend handles OAuth2 flow; frontend receives tokens post-authentication.

### Token Validation Pattern
Backend uses **token introspection** (not JWT verification):
```javascript
// middleware/auth.js - verifyToken()
POST ${KEYCLOAK_URL}/realms/${realm}/protocol/openid-connect/token/introspect
```
This validates tokens with Keycloak on every request. User info extracted from introspection response and attached to `req.user`.

### Role-Based Access Control
Roles stored in JWT `realm_access.roles`. Use middleware chain:
```javascript
app.get('/api/admin', verifyToken, requireRole('admin'), handler);
app.get('/api/dashboard', verifyToken, requireAnyRole(['user', 'admin']), handler);
```

## Development Workflows

### Quick Start (First Time Setup)
```bash
./quick-start.sh  # Starts Keycloak, runs setup-keycloak.sh
# OR manually:
docker-compose up -d
./setup-keycloak.sh  # Creates realm, client, roles, test users
cd backend && npm install && npm run dev  # Port 4000
cd frontend && npm install && npm run dev  # Port 3000
```

### Test Users (Created by setup-keycloak.sh)
- `user1` / `password123` - role: user
- `admin-user` / `admin123` - role: admin

### Environment Configuration
All config in `.env` (root). Critical vars:
- `KEYCLOAK_CLIENT_SECRET`: Must match client secret in Keycloak
- `NEXTAUTH_SECRET`: Required for NextAuth session management (frontend only, not auth)
- `BACKEND_URL`, `FRONTEND_URL`: Used in OAuth redirects

### Testing Authentication
```bash
# Get token (Resource Owner Password flow - testing only)
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token" \
  -d "username=user1&password=password123&grant_type=password" \
  -d "client_id=myapp-client&client_secret=myapp-secret-key-12345" | jq -r '.access_token')

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/protected
```

## Project-Specific Conventions

### Backend Endpoint Structure
- Public: No middleware
- Protected: `verifyToken` only
- Role-based: `verifyToken` + `requireRole('rolename')`

See `backend/server.js` endpoint documentation at root `/` for current API surface.

### Frontend Authentication Pattern
Custom `AuthClient` in `frontend/lib/auth.js` handles OAuth flow:
- `authClient.login()` - Redirects to backend OAuth flow
- `authClient.getToken()` - Retrieves from sessionStorage
- `authClient.getUser()` - Fetches user info from `/auth/user`

**NextAuth**: Used for session management (frontend), NOT for authentication (backend handles OAuth).

Protected pages check session in useEffect:
```javascript
const { data: session, status } = useSession();
useEffect(() => {
  if (status === 'unauthenticated') router.push('/auth/signin');
}, [status]);
```

### Docker Compose Environments
- `docker-compose.yml`: Dev mode (start-dev), ports exposed
- `docker-compose.prod.yml`: Production build with HAProxy config, health checks, resource limits

### Shell Scripts
- `quick-start.sh`: Full dev environment setup
- `setup-keycloak.sh`: Keycloak configuration via Admin REST API (requires `jq`)
- `start.sh`: Manual startup (Keycloak → Backend → Frontend)
- `deploy-production.sh`: Production deployment automation

## Key Files Reference

### Configuration
- `backend/keycloak-config.js`: Keycloak client config (used by keycloak-connect, though introspection pattern is primary)
- `.env`: All environment variables (not committed)

### Authentication Core
- `backend/middleware/auth.js`: Token introspection + role middleware
- `backend/routes/auth.js`: OAuth2 flow implementation
- `frontend/lib/auth.js`: Client-side auth utilities

### Documentation
- `FLUJO_OAUTH2.md`: Visual OAuth2 flow diagram
- `README_OAUTH2.md`: Detailed OAuth2 concepts
- `ANALISIS_AUTENTICACION.md`: Authentication analysis
- `PRODUCTION_DEPLOYMENT.md`: Production setup guide
- `HAPROXY_CONFIG.md`: HAProxy production configuration

**Note**: Documentation files may be outdated. Verify against actual code when in doubt.

## Common Tasks

### Adding Protected Endpoint
```javascript
// backend/server.js
app.get('/api/new-endpoint', verifyToken, requireRole('user'), (req, res) => {
  res.json({ user: req.user }); // req.user populated by verifyToken
});
```

### Adding Keycloak Client Scope
Modify `setup-keycloak.sh` client creation or use Keycloak Admin Console at `http://localhost:8080/admin` (admin/admin123).

### Debugging Token Issues
1. Check token introspection response: `backend/middleware/auth.js` logs on error
2. Verify client secret matches Keycloak: Compare `.env` with Admin Console
3. Check token expiration: Default 5-15 min, refresh handled by frontend

## Production Considerations
- Uses HAProxy for SSL termination (`KC_PROXY_HEADERS: xforwarded`)
- Optimized Keycloak build (`Dockerfile.keycloak` with `kc.sh build`)
- Database connection pooling configured via `KC_DB_POOL_*` vars
- Health checks at `:9000/health` and `:9000/metrics`
- HAProxy config documented in `HAPROXY_CONFIG.md`

## Testing
Manual testing approach. Use test users (`user1`, `admin-user`) and curl commands documented above for endpoint validation.
