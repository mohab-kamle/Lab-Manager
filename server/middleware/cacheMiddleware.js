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
      // Check if cache service is available
      if (!cacheService.isConnected) {
        // Add header to indicate cache is unavailable
        res.set('X-Cache', 'UNAVAILABLE');
        return next();
      }

      // Generate cache key based on request
      const cacheKey = cacheKeyGenerator(req);

      // Try to get data from cache with timeout
      const cacheStartTime = Date.now();
      const cachedData = await Promise.race([
        cacheGetter(cacheKey, req),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cache timeout')), 2000)
        )
      ]);

      const cacheTime = Date.now() - cacheStartTime;

      if (cachedData) {
        // Add cache hit headers for debugging
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Time', `${cacheTime}ms`);
        console.log(`🎯 Cache HIT: ${cacheKey} (${cacheTime}ms)`);
        return res.json(cachedData);
      }

      // Add cache miss header
      res.set('X-Cache', 'MISS');
      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function (data) {
        // Cache the response data
        if (res.statusCode === 200 && data && cacheService.isConnected) {
          const cachePromise = cacheSetter(cacheKey, data, req, ttl);
          cachePromise
            .then(() => {
              console.log(`💾 Cache SET: ${cacheKey} (TTL: ${ttl}s)`);
            })
            .catch(err => {
              console.warn(`⚠️ Cache SET failed for ${cacheKey}:`, err.message);
            });
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn(`⚠️ Cache middleware error for ${req.method} ${req.path}:`, error.message);
      res.set('X-Cache', 'ERROR');

      // Reset json method if it was overridden
      if (res.json !== res.json.original) {
        res.json = res.json.original || res.json;
      }

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
    let labId = req.tenant?.lab_id;
    if (!labId && req.user?.role === 'doctor') {
      labId = `doctor:${req.user.id}`;
    }
    labId = labId || 'unknown';
    return `list:${labId}:${page}:${limit}:${search}:${status}:${dateFrom}:${dateTo}`;
  },
  async (cacheKey, req) => {
    const { page = 1, limit = 20, search = '', status = '', dateFrom = '', dateTo = '' } = req.query;
    let labId = req.tenant?.lab_id;
    if (!labId && req.user?.role === 'doctor') {
      labId = `doctor:${req.user.id}`;
    }
    const filters = { search, status, dateFrom, dateTo };
    return await cacheService.getMedicalReportsList(labId, page, limit, filters);
  },
  async (cacheKey, data, req) => {
    const { page = 1, limit = 20, search = '', status = '', dateFrom = '', dateTo = '' } = req.query;
    let labId = req.tenant?.lab_id;
    if (!labId && req.user?.role === 'doctor') {
      labId = `doctor:${req.user.id}`;
    }
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
 * Cache middleware for new results data endpoint
 * Caches the complete results data with optimized parallel fetching
 * TTL: 30 minutes (balances performance with data freshness)
 */
const cacheMedicalReportNewResultsData = createCacheMiddleware(
  (req) => `newresults-data:${req.params.id}:${req.tenant?.lab_id}`,
  async (cacheKey, req) => {
    return await cacheService.getMedicalReportNewResultsData(req.params.id, req.tenant?.lab_id);
  },
  async (cacheKey, data, req) => {
    return await cacheService.setMedicalReportNewResultsData(req.params.id, req.tenant?.lab_id, data);
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
  res.json = function (data) {
    // Invalidate cache on successful update
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const reportId = req.params.id || req.params.reportId;
      if (reportId && cacheService.isConnected) {
        console.log(`🗑️ Invalidating medical report cache for ID: ${reportId}`);
        cacheService.invalidateMedicalReport(reportId)
          .then(() => {
            console.log(`✅ Medical report cache invalidated for ID: ${reportId}`);
          })
          .catch(err => {
            console.warn(`⚠️ Failed to invalidate medical report cache for ID ${reportId}:`, err.message);
          });
      } else if (!cacheService.isConnected) {
        console.log('🔌 Cache service disconnected - skipping invalidation');
      }
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
  res.json = function (data) {
    // Invalidate cache on successful update
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const testId = req.params.id || req.params.testId;
      if (testId && cacheService.isConnected) {
        console.log(`🗑️ Invalidating test results cache for ID: ${testId}`);
        cacheService.invalidateTestResults(testId)
          .then(() => {
            console.log(`✅ Test results cache invalidated for ID: ${testId}`);
          })
          .catch(err => {
            console.warn(`⚠️ Failed to invalidate test results cache for ID ${testId}:`, err.message);
          });
      } else if (!cacheService.isConnected) {
        console.log('🔌 Cache service disconnected - skipping test results invalidation');
      }
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
  res.json = function (data) {
    // Invalidate cache on successful update
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const cultureId = req.params.id || req.params.cultureId;
      if (cultureId && cacheService.isConnected) {
        console.log(`🗑️ Invalidating culture results cache for ID: ${cultureId}`);
        cacheService.invalidateCultureResults(cultureId)
          .then(() => {
            console.log(`✅ Culture results cache invalidated for ID: ${cultureId}`);
          })
          .catch(err => {
            console.warn(`⚠️ Failed to invalidate culture results cache for ID ${cultureId}:`, err.message);
          });
      } else if (!cacheService.isConnected) {
        console.log('🔌 Cache service disconnected - skipping culture results invalidation');
      }
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
  res.json = function (data) {
    // Invalidate list cache on successful creation
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const labId = req.tenant?.lab_id;
      if (labId && cacheService.isConnected) {
        console.log(`🗑️ Invalidating lab cache for lab ID: ${labId}`);
        cacheService.invalidateLabCache(labId)
          .then(() => {
            console.log(`✅ Lab cache invalidated for lab ID: ${labId}`);
          })
          .catch(err => {
            console.warn(`⚠️ Failed to invalidate lab cache for lab ID ${labId}:`, err.message);
          });
      } else if (!cacheService.isConnected) {
        console.log('🔌 Cache service disconnected - skipping lab cache invalidation');
      } else if (!labId) {
        console.warn('⚠️ No lab ID found in request - skipping lab cache invalidation');
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



/**
 * Cache middleware for invoices list
 */
const cacheInvoicesList = createCacheMiddleware(
  (req) => {
    const labId = req.tenant?.lab_id || 'unknown';
    // Use query params as part of the key if there are filters in the future
    return `invoices:list:${labId}`;
  },
  async (cacheKey, req) => {
    const labId = req.tenant?.lab_id;
    return await cacheService.getInvoicesList(labId);
  },
  async (cacheKey, data, req) => {
    const labId = req.tenant?.lab_id;
    return await cacheService.setInvoicesList(labId, {}, data);
  },
  300 // 5 minutes TTL
);

/**
 * Cache invalidation middleware for invoice updates
 */
const invalidateInvoicesList = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  // Override json method to invalidate cache after successful update
  res.json = function (data) {
    // Invalidate list cache on successful creation/update/deletion
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const labId = req.tenant?.lab_id || req.user?.lab_id;
      if (labId && cacheService.isConnected) {
        console.log(`🗑️ Invalidating invoices cache for lab ID: ${labId}`);
        cacheService.invalidateInvoicesCache(labId)
          .then(() => {
            console.log(`✅ Invoices cache invalidated for lab ID: ${labId}`);
          })
          .catch(err => {
            console.warn(`⚠️ Failed to invalidate invoices cache for lab ID ${labId}:`, err.message);
          });
      } else if (!cacheService.isConnected) {
        console.log('🔌 Cache service disconnected - skipping invoices cache invalidation');
      }
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  // Cache middleware functions
  cacheMedicalReportsList,
  cacheMedicalReportBasic,
  cacheMedicalReportTests,
  cacheMedicalReportCultures,
  cacheMedicalReportTestComponentResults,
  cacheMedicalReportComplete,
  cacheMedicalReportsSummary,
  cacheTestComponents,
  cacheMedicalReportTestGroups,
  cacheMedicalReportNewResultsData,

  // Cache invalidation middleware
  invalidateMedicalReportCache,
  invalidateTestResultsCache,
  invalidateCultureResultsCache,
  invalidateListCache,

  // Utility middleware
  addCacheHeaders,
  handleConditionalRequests,
  warmCache,

  // Factory function for custom cache middleware
  createCacheMiddleware,

  // Invoice cache middleware
  cacheInvoicesList,
  invalidateInvoicesList,
};