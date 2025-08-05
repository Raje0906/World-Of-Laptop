# Daily Sales Feature - Production Guide

## Overview

The Daily Sales feature provides a comprehensive view of sales data for any specific date, with production-ready error handling, performance optimizations, and security measures.

## Features

### ✅ Production-Ready Features

- **Date Filtering**: Precise date-based filtering with MongoDB date range queries
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Performance**: Database indexes and query optimizations
- **Security**: Input validation, rate limiting, and data sanitization
- **Monitoring**: Detailed logging and performance metrics
- **Caching**: HTTP cache headers for improved performance
- **Export**: Excel export functionality with timestamped files
- **Responsive UI**: Mobile-friendly interface with loading states

## API Endpoints

### GET `/api/sales/daily`

Retrieves daily sales data for a specific date.

#### Query Parameters

- `date` (optional): Date in YYYY-MM-DD format (defaults to today)
- `storeId` (optional): MongoDB ObjectId for store-specific filtering
- `limit` (optional): Number of results (1-1000, defaults to 1000)

#### Example Request

```bash
GET /api/sales/daily?date=2024-01-15&storeId=507f1f77bcf86cd799439011&limit=500
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "totalSales": 25,
    "totalAmount": 12500.50,
    "totalItemsSold": 45,
    "averageOrderValue": 500.02,
    "sales": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "saleNumber": "1001",
        "customer": {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "items": [
          {
            "name": "Laptop",
            "quantity": 1,
            "price": 500.00
          }
        ],
        "total": 500.00,
        "paymentMethod": "card",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  },
  "message": "Retrieved 25 sales for 2024-01-15",
  "meta": {
    "date": "2024-01-15",
    "queryTime": "2024-01-15T10:30:00.000Z",
    "resultCount": 25
  }
}
```

## Database Indexes

The following indexes are automatically created for optimal performance:

```javascript
// Basic indexes
saleSchema.index({ createdAt: -1, isActive: 1 });
saleSchema.index({ store: 1, createdAt: -1, isActive: 1 });
saleSchema.index({ customer: 1, createdAt: -1 });
saleSchema.index({ paymentMethod: 1, createdAt: -1 });
saleSchema.index({ saleNumber: 1 });

// Compound indexes for daily sales queries
saleSchema.index({ 
  isActive: 1, 
  createdAt: -1 
}, { 
  name: 'daily_sales_query_index',
  background: true 
});

saleSchema.index({ 
  store: 1, 
  isActive: 1, 
  createdAt: -1 
}, { 
  name: 'store_daily_sales_index',
  background: true 
});
```

## Configuration

### Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/laptop_store

# API Configuration
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your-jwt-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
```

### Configuration Object

```javascript
const DAILY_SALES_CONFIG = {
  MAX_RESULTS_PER_QUERY: 1000,
  DEFAULT_RESULTS_LIMIT: 1000,
  MAX_DAYS_IN_PAST: 365,
  MAX_DAYS_IN_FUTURE: 1,
  CACHE_DURATION_SECONDS: 300,
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  SLOW_QUERY_THRESHOLD_MS: 1000
};
```

## Error Handling

### Error Types

1. **Validation Errors** (400)
   - Invalid date format
   - Date too far in past/future
   - Invalid store ID
   - Invalid limit parameter

2. **Network Errors** (500)
   - Database connection issues
   - Timeout errors
   - Server errors

3. **Authentication Errors** (401)
   - Missing or invalid JWT token

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "code": "ERROR_CODE"
}
```

## Performance Monitoring

### Metrics to Monitor

1. **Response Times**
   - Average response time
   - 95th percentile response time
   - Slow query threshold (1 second)

2. **Error Rates**
   - 4xx error rate
   - 5xx error rate
   - Timeout rate

3. **Database Performance**
   - Query execution time
   - Index usage
   - Connection pool usage

### Logging

```javascript
// Request logging
console.log(`[DAILY SALES] Request: date=${date}, storeId=${storeId ? 'provided' : 'not-provided'}, limit=${limit}`);

// Success logging
console.log(`[DAILY SALES] Success: date=${date}, sales=${salesCount}, revenue=${totalAmount}`);

// Error logging
console.error("[DAILY SALES ERROR]", {
  error: error.message,
  stack: error.stack,
  query: req.query,
  timestamp: new Date().toISOString()
});
```

## Security Measures

### Input Validation

- Date format validation (YYYY-MM-DD)
- MongoDB ObjectId validation
- Numeric range validation
- SQL injection prevention (MongoDB)

### Rate Limiting

- 100 requests per 15 minutes per IP
- Configurable window and limits

### Data Sanitization

- Remove sensitive fields from response
- Validate and sanitize all inputs
- Prevent XSS attacks

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Deployment Checklist

### Pre-Deployment

- [ ] Database indexes created
- [ ] Environment variables configured
- [ ] Rate limiting enabled
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled
- [ ] Security headers configured
- [ ] CORS settings updated

### Post-Deployment

- [ ] Health check endpoint responding
- [ ] Database connection established
- [ ] Indexes building in background
- [ ] Error logs being generated
- [ ] Performance metrics being collected
- [ ] Cache headers being set correctly

## Troubleshooting

### Common Issues

1. **Slow Queries**
   - Check if indexes are built
   - Monitor query execution plans
   - Consider query optimization

2. **High Error Rates**
   - Check database connectivity
   - Monitor server resources
   - Review error logs

3. **Timeout Errors**
   - Increase timeout configuration
   - Optimize database queries
   - Check network connectivity

4. **Memory Issues**
   - Monitor memory usage
   - Implement pagination
   - Optimize data processing

### Debug Commands

```bash
# Check database indexes
db.sales.getIndexes()

# Monitor slow queries
db.setProfilingLevel(1, { slowms: 1000 })

# Check collection stats
db.sales.stats()

# Monitor connections
db.serverStatus().connections
```

## Best Practices

### Development

1. **Use Environment-Specific Configs**
   - Different settings for dev/staging/prod
   - Secure credential management

2. **Implement Comprehensive Testing**
   - Unit tests for business logic
   - Integration tests for API endpoints
   - Performance tests for queries

3. **Follow Error Handling Patterns**
   - Consistent error response format
   - Proper error logging
   - User-friendly error messages

### Production

1. **Monitor Performance**
   - Set up alerting for slow queries
   - Monitor error rates
   - Track user experience metrics

2. **Implement Caching**
   - Use HTTP cache headers
   - Consider Redis for frequently accessed data
   - Implement client-side caching

3. **Security First**
   - Regular security audits
   - Input validation at all layers
   - Rate limiting and DDoS protection

## Support

For issues or questions:

1. Check the error logs first
2. Review the troubleshooting section
3. Monitor performance metrics
4. Contact the development team

## Changelog

### v1.0.0 (Current)
- Initial production release
- Comprehensive error handling
- Performance optimizations
- Security measures
- Export functionality
- Responsive UI 