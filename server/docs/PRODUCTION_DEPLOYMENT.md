# Production Deployment Guide

## Upload Directory Persistence

This application uses two upload directories that need to be persistent:

1. **`/app/uploads`** - Main upload directory (comment images, etc.)
2. **`/app/uploads/shared`** - Shared upload directory for backward compatibility

## Docker Volume Configuration

### Development (docker-compose.yml)
```yaml
volumes:
  - uploads_data:/app/uploads          # Named volume for main uploads
  - logs_data:/app/logs               # Named volume for logs
  - ./uploads:/app/uploads/shared     # Bind mount for shared uploads
```

### Production (docker-compose.prod.yml)
```yaml
volumes:
  - uploads_data:/app/uploads         # Persistent named volume
  - logs_data:/app/logs              # Persistent named volume
```

## Deployment Steps

### 1. Production Deployment
```bash
# Deploy with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify volumes are created
docker volume ls | grep labmanager
```

### 2. Data Migration (if upgrading from bind mounts)
```bash
# Stop services
docker-compose down

# Create named volumes
docker volume create labmanager_uploads_data
docker volume create labmanager_logs_data

# Copy existing data to named volumes
docker run --rm -v $(pwd)/server/uploads:/source -v labmanager_uploads_data:/dest alpine sh -c "cp -r /source/* /dest/"
docker run --rm -v $(pwd)/server/logs:/source -v labmanager_logs_data:/dest alpine sh -c "cp -r /source/* /dest/ || true"

# Start with new configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Backup Strategy

The production configuration includes an automated backup service:

- **Schedule**: Daily at 2 AM
- **Retention**: 30 days
- **Location**: `./backups/` directory
- **Contents**: 
  - Upload files (`uploads_YYYYMMDD_HHMMSS.tar.gz`)
  - MySQL database (`mysql_YYYYMMDD_HHMMSS.sql.gz`)

### 4. Security Considerations

#### File Upload Security
- Maximum file size: 5MB per image
- Allowed file types: Images only (validated by MIME type)
- Maximum files per comment: 3 images
- File name sanitization with timestamps

#### Volume Security
- Named volumes instead of bind mounts
- Read-only mounts where possible
- File integrity monitoring
- Regular automated backups

#### Network Security
- Isolated Docker network
- Custom subnet configuration
- Internal service communication only

### 5. Monitoring

#### File Integrity Monitoring
The production setup includes a file monitor service that logs all file changes:
```bash
# View file change logs
docker logs labmanager-file-monitor
```

#### Health Checks
```bash
# Check service health
docker-compose ps

# Check volume usage
docker system df -v

# Check backup status
ls -la ./backups/
```

### 6. Maintenance

#### Manual Backup
```bash
# Create immediate backup
docker exec labmanager-backup /backup.sh
```

#### Volume Cleanup
```bash
# Remove old unused volumes (CAUTION: This will delete data)
docker volume prune

# List volume usage
docker volume ls
```

#### Log Rotation
```bash
# View log sizes
docker exec labmanager-backend du -sh /app/logs/*

# Rotate logs manually if needed
docker exec labmanager-backend find /app/logs -name "*.log" -mtime +7 -delete
```

## Environment Variables

### Required Production Variables (.docker.env)
```env
# Database
MYSQL_ROOT_PASSWORD=secure_root_password
MYSQL_DATABASE=labmanager
MYSQL_USER=labuser
MYSQL_PASSWORD=secure_lab_password

# Application
SECRET_KEY=your_secure_secret_key_here
NODE_ENV=production

# Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_RATE_LIMIT=10

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
RETENTION_DAYS=30
```

## Troubleshooting

### Upload Issues
1. Check volume mounts: `docker inspect labmanager-backend | grep Mounts -A 10`
2. Verify permissions: `docker exec labmanager-backend ls -la /app/uploads`
3. Check disk space: `docker exec labmanager-backend df -h`

### Backup Issues
1. Check backup service logs: `docker logs labmanager-backup`
2. Verify backup directory: `ls -la ./backups/`
3. Test backup restoration manually

### Performance Issues
1. Monitor resource usage: `docker stats`
2. Check volume I/O: `docker exec labmanager-backend iostat -x 1`
3. Review application logs: `docker logs labmanager-backend`

## Cloud Deployment Recommendations

### AWS
- Use EFS (Elastic File System) for shared uploads
- S3 for backup storage
- RDS for MySQL database

### Google Cloud
- Use Cloud Filestore for shared uploads
- Cloud Storage for backups
- Cloud SQL for MySQL database

### Azure
- Use Azure Files for shared uploads
- Blob Storage for backups
- Azure Database for MySQL

## Security Best Practices

1. **Regular Updates**: Keep Docker images and dependencies updated
2. **Access Control**: Implement proper file permissions and user access
3. **Encryption**: Use encrypted volumes in cloud environments
4. **Monitoring**: Set up alerts for unusual file activity
5. **Backup Testing**: Regularly test backup restoration procedures
6. **Network Security**: Use VPNs or private networks for production access