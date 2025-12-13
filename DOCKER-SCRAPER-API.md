# Docker Deployment Guide for Scraper API Server

This guide explains how to build and deploy the `scraper-api-server.js` using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

## Building the Docker Image

```bash
docker build -f Dockerfile.scraper-api -t scraper-api:latest .
```

## Running the Container

### Basic Run

```bash
docker run -d \
  --name scraper-api \
  -p 3001:3001 \
  scraper-api:latest
```

### Run with Environment Variables

```bash
docker run -d \
  --name scraper-api \
  -p 3001:3001 \
  -e PORT=3001 \
  -e NODE_ENV=production \
  scraper-api:latest
```

### Run with Volume for Output Directory

```bash
docker run -d \
  --name scraper-api \
  -p 3001:3001 \
  -v $(pwd)/output:/app/output \
  scraper-api:latest
```

## Using Docker Compose

Create a `docker-compose.scraper-api.yml` file:

```yaml
version: '3.8'

services:
  scraper-api:
    build:
      context: .
      dockerfile: Dockerfile.scraper-api
    container_name: scraper-api
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=production
    volumes:
      - ./output:/app/output
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Then run:

```bash
docker-compose -f docker-compose.scraper-api.yml up -d
```

## API Endpoints

Once the container is running, you can access:

- **Health Check**: `http://localhost:3001/api/health`
- **API Info**: `http://localhost:3001/api/info`
- **Scrape Products (GET)**: `http://localhost:3001/api/scrape?product=lays&location=RT%20Nagar`
- **Scrape Products (POST)**: `POST http://localhost:3001/api/scrape`
- **Extract Data**: `http://localhost:3001/api/extract?dir=output`

## Testing the API

```bash
# Health check
curl http://localhost:3001/api/health

# Scrape products
curl "http://localhost:3001/api/scrape?product=lays&location=RT%20Nagar"

# Or using POST
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"product": "lays", "location": "RT Nagar"}'
```

## Viewing Logs

```bash
docker logs scraper-api
docker logs -f scraper-api  # Follow logs
```

## Stopping the Container

```bash
docker stop scraper-api
docker rm scraper-api
```

## Troubleshooting

### Container exits immediately

Check logs:
```bash
docker logs scraper-api
```

### Port already in use

Change the port mapping:
```bash
docker run -d --name scraper-api -p 3002:3001 scraper-api:latest
```

### Chrome/Chromium issues

The Dockerfile includes all necessary Chrome dependencies. If you encounter browser-related errors, ensure the container has enough memory allocated (at least 1GB recommended).

## Production Deployment

For production, consider:

1. **Use a reverse proxy** (nginx, traefik) in front of the container
2. **Set resource limits**:
   ```bash
   docker run -d \
     --name scraper-api \
     -p 3001:3001 \
     --memory="2g" \
     --cpus="2" \
     scraper-api:latest
   ```

3. **Use environment variables** for configuration
4. **Set up monitoring** and logging
5. **Use a container orchestration platform** (Kubernetes, Docker Swarm) for scaling




