// keycloak-config.js
module.exports = {
  realm: process.env.KEYCLOAK_REALM || 'myapp-realm',
  'auth-server-url': process.env.KEYCLOAK_URL || 'http://localhost:8080',
  'ssl-required': 'external',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'myapp-client',
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || 'myapp-secret-key-12345'
  },
  'confidential-port': 0,
  'policy-enforcer': {}
};
