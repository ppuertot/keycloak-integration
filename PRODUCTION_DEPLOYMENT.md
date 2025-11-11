# Production Deployment Guide

## Overview
This production setup includes:
- **Keycloak** (Identity and Access Management)
- **PostgreSQL** (Database for Keycloak)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Domain with SSL certificate (recommended)
- Minimum 4GB RAM, 2 CPU cores

## Quick Start

### 1. Configure Environment Variables

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit the file with your production values
nano .env.production
```

**Required changes:**
- `POSTGRES_PASSWORD`: Strong random password
- `KEYCLOAK_ADMIN_PASSWORD`: Strong admin password
- `KC_HOSTNAME`: Your Keycloak domain (e.g., sgi-login.snpx.io)

### 2. Build and Start Services

```bash
# Build the images
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Verify Services

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Check Keycloak health
curl http://localhost:8080/health/ready

# Check Keycloak is accessible
curl http://localhost:8080/
```

## SSL/TLS Configuration

For production, you should use a reverse proxy (HAProxy, Nginx, or Traefik) with SSL.

HAProxy will redirect from port 443 (HTTPS) to port 8080 (Keycloak container).

### Example HAProxy Configuration

```haproxy
frontend https_frontend
    bind *:443 ssl crt /path/to/certificate.pem
    mode http
    
    # Keycloak ACL
    acl is_keycloak hdr(host) -i sgi-login.snpx.io
    
    # Route to Keycloak
    use_backend keycloak_backend if is_keycloak

backend keycloak_backend
    mode http
    balance roundrobin
    option forwardfor
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443
    server keycloak1 127.0.0.1:8080 check
```

### Example Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name sgi-login.snpx.io;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port 443;
    }
}
```
```

## SSL/TLS Configuration

For production, you should use a reverse proxy (Nginx, Traefik, or Caddy) with SSL:

### Example Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name auth.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Keycloak Configuration

After starting services, configure Keycloak:

1. Access Keycloak admin console: `https://sgi-login.snpx.io`
2. Login with credentials from `.env.production`
3. Create a realm (use the name from `KEYCLOAK_REALM`)
4. Create clients as needed for your applications

## Backup and Restore

### Database Backup

```bash
# Backup PostgreSQL database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U keycloak keycloak > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker compose -f docker-compose.prod.yml exec -T postgres psql -U keycloak keycloak < backup.sql
```

### Volume Backup

```bash
# Backup PostgreSQL data volume
docker run --rm -v keycloak-integration_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Restore volume
docker run --rm -v keycloak-integration_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data_backup.tar.gz -C /data
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f keycloak
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Resource Usage

```bash
# Monitor container resources
docker stats
```

### Keycloak Metrics

Keycloak metrics are enabled and available at:
- Health: `http://localhost:8080/health`
- Metrics: `http://localhost:8080/metrics`

## Security Checklist

- [ ] Changed all default passwords
- [ ] Configured SSL/TLS with valid certificates
- [ ] Enabled HTTPS strict mode in Keycloak (when using SSL)
- [ ] Set up firewall rules (only expose necessary ports)
- [ ] Regular backups configured
- [ ] Resource limits configured for containers
- [ ] Non-root users in Docker containers
- [ ] Regularly update Docker images
- [ ] Monitor logs for suspicious activity
- [ ] Enable rate limiting on reverse proxy

## Maintenance

### Update Images

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Cleanup

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAUTION: This removes unused volumes)
docker volume prune
```

## Troubleshooting

### Keycloak won't start
- Check database connection
- Verify environment variables (especially KC_HOSTNAME)
- Ensure KC_HTTP_ENABLED is true if not using SSL
- Check logs: `docker compose -f docker-compose.prod.yml logs keycloak`

### PostgreSQL connection issues
- Verify PostgreSQL is healthy
- Check database credentials in `.env.production`
- Check logs: `docker compose -f docker-compose.prod.yml logs postgres`

### Port conflicts
- Ensure port 8080 is not in use by another service
- Check with: `netstat -tuln | grep 8080`

## Performance Tuning

### Database Connection Pool
Adjust in `.env.production`:
```
KC_DB_POOL_INITIAL_SIZE=10
KC_DB_POOL_MAX_SIZE=50
KC_DB_POOL_MIN_SIZE=10
```

### Container Resources
Modify resource limits in `docker-compose.prod.yml` based on your needs.

## Support

For issues and questions, check the logs and verify:
1. All environment variables are set correctly
2. Network connectivity between services
3. SSL certificates are valid (if using HTTPS)
4. Keycloak realm and clients are configured properly
