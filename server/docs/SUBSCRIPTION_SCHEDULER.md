# Subscription Scheduler Documentation

## Overview

The Subscription Scheduler is an automated background service that manages subscription expiry for labs in the LabManager system. It runs every 3 hours to check and update expired subscriptions and trials, ensuring that subscription statuses are always accurate without manual intervention.

## Features

- **Automated Expiry Checks**: Runs every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)
- **Subscription Management**: Updates expired active subscriptions to 'expired' status
- **Trial Management**: Updates expired trial subscriptions to 'expired' status
- **Activity Logging**: Logs all subscription changes with timestamps
- **API Endpoints**: RESTful API for monitoring and manual control
- **Statistics**: Provides detailed subscription analytics

## Architecture

### Core Components

1. **Service Layer** (`services/subscriptionScheduler.js`)
   - Main scheduler logic using `node-cron`
   - Database operations for subscription updates
   - Logging and error handling

2. **API Layer** (`routes/subscriptionScheduler.js`)
   - RESTful endpoints for monitoring and control
   - Admin authentication required
   - Statistics and reporting

3. **Integration** (`index.js`)
   - Automatic initialization on server startup
   - Graceful shutdown handling

## Installation

The scheduler is automatically installed and configured. Dependencies:

```bash
npm install node-cron
```

## Configuration

### Schedule Configuration

The scheduler runs every 3 hours using the cron pattern `'0 */3 * * *'`:

- **00:00** - Midnight check
- **03:00** - Early morning check
- **06:00** - Morning check
- **09:00** - Mid-morning check
- **12:00** - Noon check
- **15:00** - Afternoon check
- **18:00** - Evening check
- **21:00** - Night check

### Database Fields

The scheduler works with the following `lab` model fields:

- `subscription_status`: ENUM('active', 'expired', 'trial')
- `subscription_end_date`: DATE
- `trial_expires_at`: DATE
- `subscription_duration`: VARCHAR(50)
- `subscription_amount`: DECIMAL(10,2)

## API Endpoints

All endpoints require admin authentication and are prefixed with `/subscription-scheduler`.

### GET /status

Retrieve scheduler status and basic statistics.

**Response:**
```json
{
  "status": "running",
  "lastRun": "2025-01-11T12:00:00.000Z",
  "nextRun": "2025-01-11T15:00:00.000Z",
  "statistics": {
    "byStatus": {
      "active": 25,
      "expired": 5,
      "trial": 3
    },
    "expiringSoon": {
      "next7Days": 2,
      "next30Days": 8
    }
  }
}
```

### POST /check-now

Manually trigger subscription check and update process.

**Response:**
```json
{
  "message": "Subscription check completed successfully",
  "results": {
    "expiredSubscriptions": 2,
    "expiredTrials": 1,
    "totalProcessed": 3
  }
}
```

### GET /expiring

List subscriptions expiring within specified days.

**Query Parameters:**
- `days` (optional): Number of days to look ahead (default: 7)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "subscriptions": [
    {
      "id": 1,
      "name": "Lab Alpha",
      "subscription_end_date": "2025-01-15",
      "subscription_duration": "monthly",
      "subscription_amount": "99.99",
      "daysUntilExpiry": 4
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  }
}
```

### GET /expired

List all expired subscriptions with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

### GET /statistics

Detailed subscription statistics and analytics.

**Response:**
```json
{
  "statusDistribution": {
    "active": 25,
    "expired": 5,
    "trial": 3
  },
  "durationDistribution": {
    "monthly": 20,
    "yearly": 8,
    "trial": 5
  },
  "revenue": {
    "total": 2500.00,
    "monthly": 1800.00,
    "yearly": 700.00
  },
  "expiring": {
    "next7Days": 2,
    "next30Days": 8,
    "next90Days": 15
  }
}
```

## Usage Examples

### Manual Subscription Check

```bash
# Trigger immediate subscription check
curl -X POST http://localhost:3000/subscription-scheduler/check-now \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Monitor Expiring Subscriptions

```bash
# Get subscriptions expiring in next 30 days
curl "http://localhost:3000/subscription-scheduler/expiring?days=30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Get Scheduler Status

```bash
# Check if scheduler is running
curl http://localhost:3000/subscription-scheduler/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Testing

A test script is provided to verify the scheduler functionality:

```bash
node scripts/testSubscriptionScheduler.js
```

This script will:
1. Test database connection
2. Run expired subscription checks
3. Run expired trial checks
4. Display current subscription statistics

## Logging

The scheduler logs all activities with timestamps:

- Subscription expiry updates
- Trial expiry updates
- Error conditions
- Scheduler start/stop events

Logs are output to the console and can be redirected to log files as needed.

## Error Handling

The scheduler includes comprehensive error handling:

- Database connection errors
- Query execution errors
- Cron job failures
- Graceful degradation on errors

## Performance Considerations

- **Efficient Queries**: Uses indexed date fields for fast lookups
- **Batch Processing**: Updates multiple records in single transactions
- **Minimal Resource Usage**: Only runs when needed (every 3 hours)
- **Non-blocking**: Doesn't interfere with main application performance

## Security

- **Admin Authentication**: All API endpoints require admin privileges
- **Input Validation**: All parameters are validated
- **SQL Injection Protection**: Uses Sequelize ORM with parameterized queries
- **Rate Limiting**: Consider implementing rate limiting for API endpoints

## Monitoring and Maintenance

### Health Checks

1. Monitor scheduler status via `/status` endpoint
2. Check logs for error patterns
3. Verify subscription updates are occurring
4. Monitor database performance

### Maintenance Tasks

1. **Regular Backups**: Ensure database backups before major updates
2. **Log Rotation**: Implement log rotation to manage disk space
3. **Performance Monitoring**: Monitor query performance and optimize as needed
4. **Dependency Updates**: Keep `node-cron` and other dependencies updated

## Troubleshooting

### Common Issues

1. **Scheduler Not Running**
   - Check server logs for initialization errors
   - Verify `node-cron` is installed
   - Ensure database connection is working

2. **Subscriptions Not Updating**
   - Check database connectivity
   - Verify date fields are properly formatted
   - Review error logs for SQL issues

3. **API Endpoints Not Working**
   - Verify admin authentication
   - Check route registration in `index.js`
   - Ensure proper middleware setup

### Debug Mode

To enable debug logging, set environment variable:

```bash
DEBUG=subscription-scheduler node index.js
```

## Future Enhancements

1. **Email Notifications**: Send renewal reminders before expiry
2. **Webhook Support**: Notify external systems of subscription changes
3. **Custom Schedules**: Allow different check frequencies per subscription type
4. **Metrics Dashboard**: Web-based monitoring interface
5. **Audit Trail**: Detailed history of all subscription changes

## Contributing

When modifying the subscription scheduler:

1. Run tests before committing changes
2. Update documentation for new features
3. Follow existing code style and patterns
4. Add appropriate error handling
5. Consider backward compatibility

## License

This subscription scheduler is part of the LabManager system and follows the same licensing terms.