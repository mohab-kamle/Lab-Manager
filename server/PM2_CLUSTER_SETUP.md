# PM2 Cluster Mode Setup for LabManager Server

This document explains the PM2 cluster mode configuration for the LabManager server in Docker production environment.

## 🚀 Overview

The server is now configured to run with PM2 in cluster mode, which provides:
- **Multi-core utilization**: Automatically uses all available CPU cores
- **Load balancing**: Distributes incoming requests across worker processes
- **Auto-restart**: Automatically restarts crashed processes
- **Zero-downtime deployments**: Graceful reloads without service interruption
- **Memory monitoring**: Automatic restart if memory usage exceeds limits

## 📁 Configuration Files

### `ecosystem.config.js`
PM2 configuration file that defines:
- **instances**: "max" (uses all available CPU cores)
- **exec_mode**: "cluster" (enables load balancing)
- **max_memory_restart**: "2G" (restart if memory exceeds 2GB)
- **node_args**: "--max-old-space-size=2048" (Node.js memory limit)
- **Logging**: Structured logs in `/app/logs/` directory

### Updated `Dockerfile`
- Uses `pm2-runtime` instead of direct Node.js execution
- Creates `/app/logs` directory for PM2 logs
- Maintains health checks for container monitoring

### Updated `docker-compose.yml`
- Removed custom command override to use PM2 from Dockerfile
- Added volume mapping for persistent logs: `./server/logs:/app/logs`

## 🛠️ Available Scripts

### Development (Local)
```bash
npm start              # Development with nodemon
npm run start:prod     # Production with PM2
npm run start:cluster  # Production cluster mode
```

### PM2 Management
```bash
npm run stop           # Stop all PM2 processes
npm run restart        # Restart all processes
npm run reload         # Zero-downtime reload
npm run delete         # Delete PM2 processes
npm run status         # Show PM2 status
npm run logs           # Show PM2 logs
```

## 🐳 Docker Usage

### Build and Run
```bash
# Build the container
docker compose build backend

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
```

### Production Deployment
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose build backend
docker compose up -d backend
```

## 📊 Monitoring

### Container Health
- Health check endpoint: `http://localhost:3001/health`
- Container status: `docker compose ps`
- Container logs: `docker compose logs backend`

### PM2 Monitoring (Inside Container)
```bash
# Enter container
docker exec -it labmanager-backend sh

# Check PM2 status
npx pm2 status

# View PM2 logs
npx pm2 logs

# Monitor in real-time
npx pm2 monit
```

### Log Files
Logs are persisted in `./server/logs/` directory:
- `combined.log`: All logs
- `out.log`: Standard output
- `error.log`: Error logs

## ⚡ Performance Benefits

1. **Multi-core Utilization**: Uses all available CPU cores instead of single-threaded Node.js
2. **Load Distribution**: Automatically balances requests across worker processes
3. **Fault Tolerance**: If one worker crashes, others continue serving requests
4. **Memory Management**: Automatic restart prevents memory leaks from accumulating
5. **Zero Downtime**: Graceful reloads during deployments

## 🔧 Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker compose logs backend
   ```

2. **PM2 processes not running**
   ```bash
   docker exec -it labmanager-backend npx pm2 status
   ```

3. **High memory usage**
   - Check `max_memory_restart` setting in `ecosystem.config.js`
   - Monitor with `npx pm2 monit`

4. **Port conflicts**
   - Ensure port 3001 is not used by other services
   - Check `docker-compose.yml` port mappings

### Reset PM2 (if needed)
```bash
# Inside container
npx pm2 kill
npx pm2 start ecosystem.config.js
```

## 📈 Scaling

To adjust the number of worker processes, modify `ecosystem.config.js`:
```javascript
instances: 4,  // Fixed number instead of "max"
```

Or use environment variable:
```javascript
instances: process.env.PM2_INSTANCES || "max",
```

## 🔒 Security Notes

- PM2 runs inside the container, not globally on the host
- Logs are contained within the Docker environment
- No additional ports exposed beyond the application port (3001)
- Health checks ensure only healthy containers receive traffic