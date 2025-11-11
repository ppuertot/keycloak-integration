#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Production Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}Warning: .env.production not found${NC}"
    echo "Creating from example..."
    cp .env.production.example .env.production
    echo -e "${RED}Please edit .env.production with your production values before continuing${NC}"
    exit 1
fi

# Validate required environment variables
source .env.production

REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "KEYCLOAK_ADMIN_PASSWORD"
    "KC_HOSTNAME"
)

MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}Error: The following required variables are not set or still have example values:${NC}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo -e "${RED}  - $VAR${NC}"
    done
    echo -e "${YELLOW}Please edit .env.production before continuing${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"

# Ask for confirmation
echo ""
echo -e "${YELLOW}This will:${NC}"
echo "  1. Start PostgreSQL database"
echo "  2. Start Keycloak identity server"
echo "  3. Configure health checks"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres pg_isready -U keycloak &> /dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}PostgreSQL failed to start${NC}"
        exit 1
    fi
done

# Wait for Keycloak
echo -n "Waiting for Keycloak..."
for i in {1..60}; do
    if docker compose -f docker-compose.prod.yml --env-file .env.production exec -T keycloak curl -f http://localhost:8080/ &> /dev/null; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 60 ]; then
        echo -e " ${RED}✗${NC}"
        echo -e "${RED}Keycloak failed to start${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Services are running:"
echo -e "  ${GREEN}✓${NC} PostgreSQL: Running"
echo -e "  ${GREEN}✓${NC} Keycloak:   https://sgi-login.snpx.io"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Configure Keycloak realm and clients"
echo "  2. Set up SSL/TLS with reverse proxy"
echo "  3. Configure backups"
echo ""
echo -e "View logs: ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "Stop services: ${YELLOW}docker compose -f docker-compose.prod.yml down${NC}"
echo ""
