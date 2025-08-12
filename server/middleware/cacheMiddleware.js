const cacheService = require('../services/cacheService');

/**
 * Cache Middleware for Medical Reports API
 * 
 * This middleware provides automatic caching and cache invalidation
 * for medical report endpoints to improve performance.
 * 
 * Features:
 * - Automatic cache checking before database queries
 * - Automatic cache setting after successful responses
 * - Cache invalidation on data modifications
 * - Graceful fallback when cache is unavailable
 */

/**
 * Generic cache middleware factory
 * @param {Function} cacheKeyGenerator - Function to generate cache key
 * @param {Function} cacheGetter - Function to get data from cache
 * @param {Function} cacheSetter - Function to set data in cache
 * @param {number} ttl - Time to live in seconds
 */
function createCacheMiddleware(cacheKeyGenerator, cacheGetter, cacheSetter, ttl = 3600) {
  return async (req, res, next) => {
    try {
      // Generate cache key based on request
      const cacheKey = cacheKeyGenerator(req);
      
      // Try to get data from cache
      const cachedData = await cacheGetter(cacheKey, req);
      
      if (cachedData) {
        // Add cache hit header for debugging
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }
      
      // Add cache miss header
      res.set('X-Cache', 'MISS');
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache the response
      res.json = function(data) {
        // Cache the response data
        if (res.statusCode === 200 && data) {
          cacheSetter(cacheKey, data, req, ttl).catch(err => {
            console.warn('Failed to cache response:', err.message);
          });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.warn('Cache middleware error:', error.message);
      // Continue without cache on error
      next();
    }
  };
}

/**
 * Cache middleware for medical reports list
 */
const cacheMedicalReportsList = createCacheMiddleware(
  (req) => {
    const { page = 1, limit = 20, search = '', status = '', dateFrom = '', dateTo = '' } = req.query;
    const labId = req.tenant?.lab_id || 'unknown';
    return `list:${labId}:${page}:${limit}:${search}:${status}:${dateFrom}:${dateTo}`;
  },
  async (cacheKey, req) => {
    const { page = 1, limit = 20, search = '', status = '', dateFrom = '', dateTo = '' } = req.query;
    const labId = req.tenant?.lab_id;
    const filters = { search, status, dateFrom, dateTo };
    return await cacheService.getMedicalReportsList(labId, page, limit, filters);
  },
  async (cacheKey, data, req) => {
    const { page = 1, limit = 20, search = '', status = '', dateFrom = '', dateTo = '' } = req.query;
    const labId = req.tenant?.lab_id;
    const filters = { search, status, dateFrom, dateTo };
    return await cacheService.setMedicalReportsList(labId, page, limit, filters, data);
  },
  300 // 5 minutes TTL for lists
);

/**
 * Cache middleware for basic medical report data
 */
const cacheMedicalReportBasic = createCacheMiddleware(
  (req) => `basic:${req.params.id}`,
  async (cacheKey, req) => {
    return await cacheService.getMedicalReportBasic(req.params.id);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setMedicalReportBasic(req.params.id, data);
  },
  1800 // 30 minutes TTL
);

/**
 * Cache middleware for medical report tests
 */
const cacheMedicalReportTests = createCacheMiddleware(
  (req) => {
    const includeComponents = req.query.includeComponents === 'true';
    return `tests:${req.params.id}:${includeComponents}`;
  },
  async (cacheKey, req) => {
    const includeComponents = req.query.includeComponents === 'true';
    return await cacheService.getMedicalReportTests(req.params.id, includeComponents);
  },
  async (cacheKey, data, req) => {
    const includeComponents = req.query.includeComponents === 'true';
    return await cacheService.setMedicalReportTests(req.params.id, includeComponents, data);
  },
  1800 // 30 minutes TTL
);

/**
 * Cache middleware for medical report cultures
 */
const cacheMedicalReportCultures = createCacheMiddleware(
  (req) => `cultures:${req.params.id}`,
  async (cacheKey, req) => {
    return await cacheService.getMedicalReportCultures(req.params.id);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setMedicalReportCultures(req.params.id, data);
  },
  1800 // 30 minutes TTL
);

/**
 * Cache middleware for medical report test component results
 */
const cacheMedicalReportTestComponentResults = createCacheMiddleware(
  (req) => `test-components:${req.params.id}`,
  async (cacheKey, req) => {
    return await cacheService.getMedicalReportTestComponentResults(req.params.id);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setMedicalReportTestComponentResults(req.params.id, data);
  },
  900 // 15 minutes TTL for results
);

/**
 * Cache middleware for complete medical report (PDF generation)
 */
const cacheMedicalReportComplete = createCacheMiddleware(
  (req) => `complete:${req.params.id}`,
  async (cacheKey, req) => {
    return await cacheService.getMedicalReportComplete(req.params.id);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setMedicalReportComplete(req.params.id, data);
  },
  3600 // 1 hour TTL
);

/**
 * Cache middleware for medical reports summary
 */
const cacheMedicalReportsSummary = createCacheMiddleware(
  (req) => {
    const labId = req.tenant?.lab_id || 'unknown';
    return `summary:${labId}`;
  },
  async (cacheKey, req) => {
    const labId = req.tenant?.lab_id;
    return await cacheService.getMedicalReportsSummary(labId);
  },
  async (cacheKey, data, req) => {
    const labId = req.tenant?.lab_id;
    return await cacheService.setMedicalReportsSummary(labId, data);
  },
  300 // 5 minutes TTL for summary
);

/**
 * Cache middleware for test components
 */
const cacheTestComponents = createCacheMiddleware(
  (req) => `test-components:${req.params.testId}`,
  async (cacheKey, req) => {
    return await cacheService.getTestComponents(req.params.testId);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setTestComponents(req.params.testId, data);
  },
  7200 // 2 hours TTL for test components
);

/**
 * Cache middleware for medical report test groups
 */
const cacheMedicalReportTestGroups = createCacheMiddleware(
  (req) => `test-groups:${req.params.id}`,
  async (cacheKey, req) => {
    return await cacheService.getMedicalReportTestGroups(req.params.id);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setMedicalReportTestGroups(req.params.id, data);
  },
  1800 // 30 minutes TTL
);

/**
 * Cache invalidation middleware for medical report updates
 */
const invalidateMedicalReportCache = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to invalidate cache after successful update
  res.json = function(data) {
    // Invalidate cache on successful update
    if (res.statusCode === 200 && req.params.id) {
      cacheService.invalidateMedicalReport(req.params.id).catch(err => {
        console.warn('Failed to invalidate medical report cache:', err.message);
      });
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Cache invalidation middleware for test results updates
 */
const invalidateTestResultsCache = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to invalidate cache after successful update
  res.json = function(data) {
    // Invalidate cache on successful update
    if (res.statusCode === 200 && req.params.id) {
      cacheService.invalidateTestResults(req.params.id).catch(err => {
        console.warn('Failed to invalidate test results cache:', err.message);
      });
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Cache invalidation middleware for culture results updates
 */
const invalidateCultureResultsCache = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to invalidate cache after successful update
  res.json = function(data) {
    // Invalidate cache on successful update
    if (res.statusCode === 200 && req.params.id) {
      cacheService.invalidateCultureResults(req.params.id).catch(err => {
        console.warn('Failed to invalidate culture results cache:', err.message);
      });
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Cache invalidation middleware for new medical report creation
 */
const invalidateListCache = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to invalidate list cache after successful creation
  res.json = function(data) {
    // Invalidate list cache on successful creation
    if (res.statusCode === 200 || res.statusCode === 201) {
      const labId = req.tenant?.lab_id;
      if (labId) {
        cacheService.invalidateLabCache(labId).catch(err => {
          console.warn('Failed to invalidate lab cache:', err.message);
        });
      }
    }
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to add cache control headers
 */
const addCacheHeaders = (maxAge = 300) => {
  return (req, res, next) => {
    // Add cache control headers for client-side caching
    res.set({
      'Cache-Control': `public, max-age=${maxAge}`,
      'ETag': `"${Date.now()}"`, // Simple ETag based on timestamp
    });
    
    next();
  };
};

/**
 * Middleware to handle conditional requests (304 Not Modified)
 */
const handleConditionalRequests = (req, res, next) => {
  const ifNoneMatch = req.get('If-None-Match');
  const etag = res.get('ETag');
  
  if (ifNoneMatch && etag && ifNoneMatch === etag) {
    return res.status(304).end();
  }
  
  next();
};

/**
 * Cache warming middleware - preloads frequently accessed data
 */
const warmCache = async (req, res, next) => {
  // This can be used on application startup or specific endpoints
  // to preload frequently accessed data
  
  if (req.query.warmCache === 'true' && req.tenant?.lab_id) {
    cacheService.warmUpCache(req.tenant.lab_id).catch(err => {
      console.warn('Cache warm-up failed:', err.message);
    });
  }
  
  next();
};

module.exports = {
  // Cache middlewares
  cacheMedicalReportsList,
  cacheMedicalReportBasic,
  cacheMedicalReportTests,
  cacheMedicalReportCultures,
  cacheMedicalReportTestComponentResults,
  cacheMedicalReportComplete,
  cacheMedicalReportsSummary,
  cacheTestComponents,
  cacheMedicalReportTestGroups,
  
  // Cache invalidation middlewares
  invalidateMedicalReportCache,
  invalidateTestResultsCache,
  invalidateCultureResultsCache,
  invalidateListCache,
  
  // Utility middlewares
  addCacheHeaders,
  handleConditionalRequests,
  warmCache,
  
  // Generic cache middleware factory
  createCacheMiddleware,
};