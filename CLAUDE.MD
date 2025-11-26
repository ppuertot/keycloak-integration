# CLAUDE.MD - AI Assistant Instructions

## Project Overview

This is a full-stack OAuth2 authentication demonstration using **Keycloak** as the Identity Provider (IdP), **Express.js** for the backend API, and **Next.js** for the frontend. The project implements the OAuth2 Authorization Code flow with PKCE and token introspection for secure authentication and authorization.

### Key Technologies
- **Keycloak 26.4.2**: Identity and Access Management
- **Express.js**: Backend REST API
- **Next.js**: Frontend React framework with NextAuth.js
- **PostgreSQL**: Database for Keycloak
- **Docker & Docker Compose**: Container orchestration
- **HAProxy**: Production reverse proxy and SSL termination

## Architecture

### Authentication Flow (Critical Understanding)

```
1. User clicks "Login" → Frontend redirects to backend /auth/login
2. Backend redirects to Keycloak authorization endpoint
3. User authenticates in Keycloak (NOT in our application)
4. Keycloak returns authorization code to backend /auth/callback
5. Backend exchanges code for tokens (access_token + refresh_token)
6. Backend stores refresh_token in httpOnly cookie (secure)
7. Backend redirects to frontend with access_token in URL
8. Frontend stores access_token in sessionStorage
```

**Critical Principle**: The backend owns the OAuth2 flow. The frontend only receives tokens after authentication is complete.

### Token Management Pattern

#### Token Validation
Backend uses **token introspection** (NOT JWT signature verification):
```javascript
POST /realms/{realm}/protocol/openid-connect/token/introspect
```

This validates tokens with Keycloak on every request, ensuring tokens haven't been revoked. User information is extracted from the introspection response and attached to `req.user`.

#### Token Storage
- **Refresh Token**: HttpOnly cookie (backend-managed, not accessible to JavaScript)
- **Access Token**: sessionStorage (frontend-managed, cleared on browser close)

#### Why Introspection vs JWT Verification?
Introspection checks token validity with Keycloak in real-time, detecting revocations. Local JWT verification cannot detect revoked tokens.

### Role-Based Access Control (RBAC)

Roles are stored in the JWT at `realm_access.roles`. Backend middleware enforces RBAC:

```javascript
// Single role required
app.get('/api/admin', verifyToken, requireRole('admin'), handler);

// Any of multiple roles required
app.get('/api/dashboard', verifyToken, requireAnyRole(['user', 'admin']), handler);
```

## Project Structure

```
keycloak-integration/
├── backend/
│   ├── server.js                    # Main Express server
│   ├── keycloak-config.js          # Keycloak client configuration
│   ├── middleware/
│   │   └── auth.js                 # Token introspection + RBAC middleware
│   └── routes/
│       └── auth.js                 # OAuth2 flow endpoints
├── frontend/
│   ├── pages/
│   │   ├── _app.js                 # NextAuth SessionProvider wrapper
│   │   ├── index.js                # Landing page
│   │   ├── dashboard.js            # Protected dashboard
│   │   ├── profile.js              # User profile (protected)
│   │   ├── auth/
│   │   │   ├── signin.js          # Login page
│   │   │   ├── success.js         # OAuth callback handler
│   │   │   └── error.js           # Error page
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth].js # NextAuth configuration
│   └── lib/
│       ├── auth.js                 # AuthClient class for API calls
│       └── keycloak.js             # Keycloak provider for NextAuth
├── docker-compose.yml              # Development environment
├── docker-compose.prod.yml         # Production with HAProxy
├── Dockerfile.keycloak             # Optimized Keycloak build
├── setup-keycloak.sh              # Automated Keycloak setup
├── quick-start.sh                 # One-command dev setup
├── .env                           # Environment variables (not committed)
└── .env.production.example        # Production config template
```

## Key Files Reference

### Backend Core Files

#### `backend/middleware/auth.js`
**Purpose**: Token validation and authorization
**Key Functions**:
- `verifyToken`: Validates access token via Keycloak introspection, attaches `req.user`
- `requireRole(role)`: Enforces single role requirement
- `requireAnyRole(roles)`: Enforces any-of-multiple roles requirement

**Usage Pattern**:
```javascript
app.get('/protected', verifyToken, handler);
app.get('/admin-only', verifyToken, requireRole('admin'), handler);
```

#### `backend/routes/auth.js`
**Purpose**: OAuth2 flow implementation
**Endpoints**:
- `GET /auth/login`: Initiates OAuth flow, redirects to Keycloak
- `GET /auth/callback`: Receives authorization code, exchanges for tokens
- `POST /auth/refresh`: Refreshes access token using refresh token
- `POST /auth/logout`: Revokes tokens and clears cookies
- `GET /auth/user`: Returns current user info from Keycloak

**Important**: Uses state parameter for CSRF protection during OAuth flow.

#### `backend/server.js`
**Purpose**: Main application entry point
**Structure**:
- Public endpoints (no auth required)
- Protected endpoints (`verifyToken` only)
- Role-restricted endpoints (`verifyToken` + `requireRole`)

### Frontend Core Files

#### `frontend/lib/auth.js`
**Purpose**: Client-side authentication utilities
**Class**: `AuthClient`
**Methods**:
- `login()`: Redirects to backend OAuth flow
- `logout()`: Clears tokens and session
- `getToken()`: Retrieves access token from sessionStorage
- `getUser()`: Fetches user info from backend
- `apiCall(endpoint, options)`: Makes authenticated API requests with automatic token refresh
- `refreshToken()`: Requests new access token using refresh cookie

**Usage**:
```javascript
import { authClient } from '@/lib/auth';

// Login
authClient.login();

// API call with auto-refresh
const response = await authClient.apiCall('/api/profile');
const data = await response.json();
```

#### `frontend/pages/auth/success.js`
**Purpose**: OAuth callback landing page
**Flow**:
1. Receives access_token from URL query parameter
2. Stores token via `authClient.setToken()`
3. Redirects to dashboard

#### `frontend/lib/keycloak.js`
**Purpose**: NextAuth Keycloak provider configuration
**Note**: NextAuth is used for session management on the frontend only. Authentication is handled by the backend OAuth flow.

### Configuration Files

#### `.env` (not committed)
**Critical Variables**:
```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=myapp-realm
KEYCLOAK_CLIENT_ID=myapp-client
KEYCLOAK_CLIENT_SECRET=myapp-secret-key-12345

BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
BACKEND_PORT=4000

NEXTAUTH_SECRET=your-super-secret-key
NEXTAUTH_URL=http://localhost:3000
```

**Important**: `KEYCLOAK_CLIENT_SECRET` must match the client secret configured in Keycloak Admin Console.

## Development Workflows

### First-Time Setup

```bash
# Option 1: Automated quick start
./quick-start.sh

# Option 2: Manual setup
docker-compose up -d
./setup-keycloak.sh  # Creates realm, client, roles, test users
cd backend && npm install && npm run dev  # Port 4000
cd frontend && npm install && npm run dev  # Port 3000
```

### Test Users (Created by setup-keycloak.sh)
- **user1** / password123 → role: `user`
- **admin-user** / admin123 → role: `admin`

### Keycloak Admin Access
- URL: http://localhost:8080/admin
- Username: admin
- Password: admin123
- Realm: myapp-realm

### Development URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Keycloak: http://localhost:8080
- Keycloak Realm: http://localhost:8080/realms/myapp-realm
- OpenID Configuration: http://localhost:8080/realms/myapp-realm/.well-known/openid-configuration

## Common Tasks

### Adding a New Protected Endpoint

**Backend** (`backend/server.js`):
```javascript
const { verifyToken, requireRole } = require('./middleware/auth');

// Protected (authentication only)
app.get('/api/my-data', verifyToken, (req, res) => {
  res.json({
    message: 'Protected data',
    user: req.user  // Contains: sub, username, email, roles, name
  });
});

// Role-restricted
app.get('/api/admin-panel', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin only' });
});
```

### Adding a New Protected Page

**Frontend** (`frontend/pages/my-page.js`):
```javascript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { authClient } from '@/lib/auth';

export default function MyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      const response = await authClient.apiCall('/api/my-data');
      const result = await response.json();
      setData(result);
    }
    fetchData();
  }, []);

  if (status === 'loading') return <div>Loading...</div>;

  return <div>{/* Your content */}</div>;
}
```

### Adding a New Role

**Option 1: Via Keycloak Admin Console**
1. Navigate to http://localhost:8080/admin
2. Select realm `myapp-realm`
3. Go to Realm roles → Create role
4. Assign role to users in Users section

**Option 2: Via setup-keycloak.sh**
Edit the script and add:
```bash
curl -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-role"}'
```

### Testing with cURL

```bash
# 1. Get access token (Resource Owner Password flow - testing only)
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token" \
  -d "username=user1" \
  -d "password=password123" \
  -d "grant_type=password" \
  -d "client_id=myapp-client" \
  -d "client_secret=myapp-secret-key-12345" | jq -r '.access_token')

# 2. Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/protected

# 3. Test role-restricted endpoint (will fail with user1)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin

# 4. Test with admin user
ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token" \
  -d "username=admin-user" \
  -d "password=admin123" \
  -d "grant_type=password" \
  -d "client_id=myapp-client" \
  -d "client_secret=myapp-secret-key-12345" | jq -r '.access_token')

curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:4000/api/admin
```

**Important**: Resource Owner Password flow is for testing only. Production uses Authorization Code flow.

## Important Conventions

### Backend Endpoint Patterns

1. **Public endpoints**: No middleware
```javascript
app.get('/api/health', (req, res) => { ... });
```

2. **Protected endpoints**: `verifyToken` only
```javascript
app.get('/api/protected', verifyToken, (req, res) => { ... });
```

3. **Role-restricted endpoints**: `verifyToken` + role middleware
```javascript
app.get('/api/admin', verifyToken, requireRole('admin'), (req, res) => { ... });
```

### Frontend Authentication Patterns

#### Pattern 1: Protected Page
```javascript
const { data: session, status } = useSession();

useEffect(() => {
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
  }
}, [status, router]);
```

#### Pattern 2: Authenticated API Call
```javascript
// Always use authClient.apiCall() for automatic token refresh
const response = await authClient.apiCall('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data })
});
```

#### Pattern 3: Manual Token Check
```javascript
if (!authClient.isAuthenticated()) {
  router.push('/auth/signin');
  return;
}
```

### Error Handling

Backend returns consistent error format:
```javascript
{
  "error": "Error message",
  "requiredRole": "admin"  // For 403 errors
}
```

Frontend should handle:
- `401 Unauthorized`: Token expired/invalid → trigger refresh or logout
- `403 Forbidden`: Insufficient permissions → show error message

## Troubleshooting

### "Invalid redirect_uri" Error

**Cause**: Redirect URI mismatch between backend and Keycloak client configuration

**Solution**:
1. Check `BACKEND_URL` in `.env`
2. Verify in Keycloak Admin Console → Clients → myapp-client → Valid redirect URIs
3. Ensure `http://localhost:4000/*` is listed

### "CORS Error"

**Cause**: Missing credentials or origin configuration

**Solution**:
1. Backend: Ensure `credentials: true` in CORS config
```javascript
cors({
  origin: [process.env.FRONTEND_URL],
  credentials: true
})
```

2. Frontend: Include credentials in fetch
```javascript
fetch(url, { credentials: 'include' })
```

### "Token Invalid" Immediately After Login

**Possible Causes**:
1. `KEYCLOAK_CLIENT_SECRET` mismatch
2. Token introspection endpoint unreachable
3. Clock skew between backend and Keycloak

**Debug Steps**:
1. Compare `.env` secret with Keycloak Admin Console
2. Check backend logs for introspection errors
3. Verify Keycloak is accessible: `curl http://localhost:8080/health`

### User Missing Expected Roles

**Possible Causes**:
1. Roles not assigned in Keycloak
2. Client scope not including realm roles

**Solution**:
1. Keycloak Admin → Users → Select user → Role mapping → Assign role
2. Verify token includes roles:
```bash
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .realm_access.roles
```

### Frontend Cannot Reach Backend

**Possible Causes**:
1. Backend not running
2. Wrong `NEXT_PUBLIC_BACKEND_URL`

**Solution**:
1. Verify backend: `curl http://localhost:4000/api/health`
2. Check environment variable in frontend `.env.local`

### Keycloak Won't Start

**Debug Steps**:
```bash
# Check logs
docker-compose logs keycloak

# Common issues:
# - Port 8080 already in use
# - Database connection failed
# - Insufficient memory

# Restart
docker-compose restart keycloak
```

## Production Deployment

See `PRODUCTION_DEPLOYMENT.md` for comprehensive guide.

### Key Production Changes

1. **Environment Variables**:
   - Set `NODE_ENV=production`
   - Use HTTPS URLs for all endpoints
   - Generate secure secrets (minimum 32 characters)
   - Configure `KC_PROXY_HEADERS=xforwarded` for HAProxy

2. **Keycloak Optimization**:
   - Build optimized image: `docker build -f Dockerfile.keycloak`
   - Configure database connection pooling
   - Enable health checks at `:9000/health` and `:9000/metrics`

3. **HAProxy Configuration**:
   - SSL termination
   - Backend health checks
   - Rate limiting
   - See `HAPROXY_CONFIG.md` for configuration

4. **Security**:
   - Disable `start-dev` mode, use `start` with database
   - Configure email verification
   - Set up password policies
   - Enable HTTPS only
   - Configure session timeouts

## Documentation Reference

- **FLUJO_OAUTH2.md**: Visual OAuth2 flow diagrams
- **README_OAUTH2.md**: Detailed OAuth2 concepts and theory
- **GUIA_MIGRACION_OAUTH2.md**: Migration guide from manual auth to OAuth2
- **ANALISIS_AUTENTICACION.md**: Authentication analysis and decisions
- **PRODUCTION_DEPLOYMENT.md**: Production deployment guide
- **HAPROXY_CONFIG.md**: HAProxy configuration documentation
- **ARGUMENTOS_OAUTH2_BACKEND.md**: Backend OAuth2 arguments and reasoning

**Note**: Some documentation may be in Spanish. When in doubt, verify against actual code.

## Testing Strategy

### Manual Testing
This project uses manual testing with test users and cURL commands.

**Test Checklist**:
- [ ] Login flow redirects to Keycloak
- [ ] Successful authentication redirects to frontend
- [ ] Access token stored in sessionStorage
- [ ] Protected pages redirect to login when unauthenticated
- [ ] Role-based access control works (user vs admin)
- [ ] Token refresh works automatically
- [ ] Logout clears tokens and redirects
- [ ] Expired tokens trigger refresh or logout

### Automated Testing (Future)
Consider adding:
- Jest for unit tests (middleware logic)
- Cypress for E2E tests (OAuth flow)
- Supertest for API endpoint tests

## Best Practices

### Security
1. Never store refresh tokens in sessionStorage or localStorage
2. Always use httpOnly cookies for refresh tokens
3. Use introspection, not local JWT verification (detects revocation)
4. Validate state parameter in OAuth callback (CSRF protection)
5. Use HTTPS in production
6. Set secure cookie flags in production

### Code Organization
1. Keep authentication logic in `middleware/auth.js`
2. Keep OAuth flow logic in `routes/auth.js`
3. Use `authClient` for all frontend API calls
4. Centralize environment config in `.env`

### Error Handling
1. Log authentication errors on backend
2. Return generic error messages to client (avoid leaking details)
3. Handle token refresh failures gracefully
4. Implement retry logic for transient failures

## FAQ

### Why not use Resource Owner Password flow in production?
Resource Owner Password flow requires the app to handle user credentials, defeating the purpose of delegating authentication to Keycloak. Use Authorization Code flow instead.

### Why introspection instead of JWT verification?
Introspection validates with Keycloak in real-time, detecting revoked tokens. Local JWT verification cannot detect revocations.

### Why NextAuth if backend handles authentication?
NextAuth is used for session management on the frontend only, not for authentication. It provides convenient React hooks (`useSession`) for checking auth state.

### Can I use this with a different Identity Provider?
Yes, but you'll need to:
1. Update OAuth endpoints in `routes/auth.js`
2. Adjust token introspection endpoint in `middleware/auth.js`
3. Update environment variables

### How do I migrate existing users?
See `GUIA_MIGRACION_OAUTH2.md` section "Paso 4: Migración de Usuarios" for migration scripts and strategies.

## Getting Help

For issues specific to:
- **Keycloak**: https://www.keycloak.org/documentation
- **OAuth2**: https://oauth.net/2/
- **NextAuth**: https://next-auth.js.org/
- **Express.js**: https://expressjs.com/

## License

MIT
