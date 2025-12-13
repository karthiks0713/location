# Docker Deployment Guide for API Server

This guide explains how to deploy the API server using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier deployment)

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the Docker image:**
   ```bash
   docker build -f Dockerfile.api -t mcp-selenium-api .
   ```

2. **Run the container:**
   
   **Linux/Mac:**
   ```bash
   docker run -d \
     --name mcp-selenium-api \
     -p 3000:3000 \
     -v $(pwd)/output:/app/output \
     mcp-selenium-api
   ```
   
   **Windows PowerShell:**
   ```powershell
   docker run -d `
     --name mcp-selenium-api `
     -p 3000:3000 `
     -v ${PWD}/output:/app/output `
     mcp-selenium-api
   ```
   
   **Windows CMD:**
   ```cmd
   docker run -d --name mcp-selenium-api -p 3000:3000 -v %CD%\output:/app/output mcp-selenium-api
   ```

3. **View logs:**
   ```bash
   docker logs -f mcp-selenium-api
   ```

4. **Stop the container:**
   ```bash
   docker stop mcp-selenium-api
   docker rm mcp-selenium-api
   ```

## Environment Variables

You can customize the deployment using environment variables:

- `PORT`: API server port (default: 3000)
- `NODE_ENV`: Node environment (default: production)

Example with custom port:

**Linux/Mac:**
```bash
docker run -d \
  --name mcp-selenium-api \
  -p 8080:8080 \
  -e PORT=8080 \
  -v $(pwd)/output:/app/output \
  mcp-selenium-api
```

**Windows PowerShell:**
```powershell
docker run -d `
  --name mcp-selenium-api `
  -p 8080:8080 `
  -e PORT=8080 `
  -v ${PWD}/output:/app/output `
  mcp-selenium-api
```

## Volume Mounts

The `output` directory is mounted as a volume to persist extracted data between container restarts. Make sure the `output` directory exists in your project root:

```bash
mkdir -p output
```

## API Endpoints

Once the container is running, you can access the API at:

- Health check: `http://localhost:3000/`
- API documentation: `http://localhost:3000/`
- Scrape products: `POST http://localhost:3000/api/scrape`
- Get data: `GET http://localhost:3000/api/data`

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker logs mcp-selenium-api
   ```

2. Verify port 3000 is not in use:
   ```bash
   # Linux/Mac
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

### Browser automation issues

The container includes Chromium and all necessary dependencies for Selenium/Playwright. If you encounter browser-related errors:

1. Check that Chrome dependencies are installed:
   ```bash
   docker exec mcp-selenium-api chromium --version
   ```

2. Verify environment variables:
   ```bash
   docker exec mcp-selenium-api env | grep CHROME
   ```

### Health check failures

The container includes a health check that verifies the API is responding. If health checks fail:

1. Check if the API is actually running:
   ```bash
   docker exec mcp-selenium-api curl http://localhost:3000/
   ```

2. Review application logs for errors

## Production Deployment

For production deployments, consider:

1. **Using a reverse proxy** (nginx, Traefik, etc.) in front of the container
2. **Setting up SSL/TLS** certificates
3. **Configuring resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```
4. **Setting up log rotation** for container logs
5. **Using Docker secrets** for sensitive configuration

## Building for Different Platforms

To build for a specific platform (e.g., ARM64):

```bash
docker build --platform linux/arm64 -f Dockerfile.api -t mcp-selenium-api .
```

## Updating the Image

After making changes to the code:

1. Rebuild the image:
   ```bash
   docker-compose build
   # or
   docker build -f Dockerfile.api -t mcp-selenium-api .
   ```

2. Restart the container:
   ```bash
   docker-compose up -d
   # or
   docker restart mcp-selenium-api
   ```

