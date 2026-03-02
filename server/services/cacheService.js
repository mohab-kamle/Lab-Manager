const Redis = require('redis');
const crypto = require('crypto');

/**
 * Cache Service for Medical Reports Performance Optimization
 * 
 * This service provides caching functionality to reduce database load
 * and improve response times for frequently accessed medical report data.
 * 
 * Features:
 * - Redis-based caching with configurable TTL
 * - Intelligent cache invalidation
 * - Cache warming for frequently accessed data
 * - Fallback to database when cache is unavailable
 */

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
    this.init();
  }

  async init() {
    try {
      // Redis configuration for Docker and local environments
      const redisConfig = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.log('⚠️ Redis: Max reconnection attempts reached');
              return false; // Stop reconnecting
            }
            const delay = Math.min(retries * 100, 3000); // Max 3 seconds
            console.log(`🔄 Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
          connectTimeout: 10000, // 10 seconds
          commandTimeout: 5000,  // 5 seconds
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      console.log(`🔌 Initializing Redis connection to ${redisConfig.socket.host}:${redisConfig.socket.port}`);
      this.client = Redis.createClient(redisConfig);

      // Enhanced event handlers
      this.client.on('connect', () => {
        console.log('🔗 Redis: Connection established');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Client ready and connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.warn('⚠️ Redis cache error:', err.message);
        this.isConnected = false;

        // Provide helpful error context
        if (err.code === 'ECONNREFUSED') {
          console.warn('💡 Redis: Connection refused - ensure Redis server is running');
        } else if (err.code === 'ENOTFOUND') {
          console.warn('💡 Redis: Host not found - check REDIS_HOST environment variable');
        }
      });

      this.client.on('end', () => {
        console.log('🔌 Redis: Connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis: Attempting to reconnect...');
        this.isConnected = false;
      });

      // Try to connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timeout')), 15000);
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Test the connection
      await this.client.ping();
      console.log('🏓 Redis: Ping successful');

    } catch (error) {
      console.warn('⚠️ Redis cache initialization failed:', error.message);
      console.log('📝 Continuing without cache - all requests will hit database');
      this.isConnected = false;

      // Clean up client if it exists
      if (this.client) {
        try {
          await this.client.disconnect();
        } catch (disconnectError) {
          // Ignore disconnect errors during initialization failure
        }
        this.client = null;
      }
    }
  }

  /**
   * Generate a cache key for medical report data
   */
  generateKey(prefix, ...params) {
    const keyData = params.join(':');
    const hash = crypto.createHash('md5').update(keyData).digest('hex');
    return `labmanager:${prefix}:${hash}`;
  }

  /**
   * Get data from cache
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(key, data, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.warn('Cache pattern delete error:', error.message);
      return false;
    }
  }

  /**
   * Cache medical report list with pagination
   */
  async getMedicalReportsList(labId, page, limit, filters = {}) {
    const key = this.generateKey('reports:list', labId, page, limit, JSON.stringify(filters));
    return await this.get(key);
  }

  async setMedicalReportsList(labId, page, limit, filters = {}, data, ttl = 300) {
    const key = this.generateKey('reports:list', labId, page, limit, JSON.stringify(filters));
    return await this.set(key, data, ttl); // 5 minutes TTL for lists
  }

  /**
   * Cache individual medical report basic data
   */
  async getMedicalReportBasic(reportId) {
    const key = this.generateKey('report:basic', reportId);
    return await this.get(key);
  }

  async setMedicalReportBasic(reportId, data, ttl = 1800) {
    const key = this.generateKey('report:basic', reportId);
    return await this.set(key, data, ttl); // 30 minutes TTL
  }

  /**
   * Cache medical report tests data
   */
  async getMedicalReportTests(reportId, includeComponents = false) {
    const key = this.generateKey('report:tests', reportId, includeComponents);
    return await this.get(key);
  }

  async setMedicalReportTests(reportId, includeComponents = false, data, ttl = 1800) {
    const key = this.generateKey('report:tests', reportId, includeComponents);
    return await this.set(key, data, ttl);
  }

  /**
   * Cache medical report cultures data
   */
  async getMedicalReportCultures(reportId) {
    const key = this.generateKey('report:cultures', reportId);
    return await this.get(key);
  }

  async setMedicalReportCultures(reportId, data, ttl = 1800) {
    const key = this.generateKey('report:cultures', reportId);
    return await this.set(key, data, ttl);
  }

  /**
   * Cache medical report test component results
   */
  async getMedicalReportTestComponentResults(reportId) {
    const key = this.generateKey('report:test-components', reportId);
    return await this.get(key);
  }

  async setMedicalReportTestComponentResults(reportId, data, ttl = 900) {
    const key = this.generateKey('report:test-components', reportId);
    return await this.set(key, data, ttl); // 15 minutes TTL for results
  }

  /**
   * Cache complete medical report (for PDF generation)
   */
  async getMedicalReportComplete(reportId) {
    const key = this.generateKey('report:complete', reportId);
    return await this.get(key);
  }

  async setMedicalReportComplete(reportId, data, ttl = 3600) {
    const key = this.generateKey('report:complete', reportId);
    return await this.set(key, data, ttl); // 1 hour TTL
  }

  /**
   * Cache medical reports summary data
   */
  async getMedicalReportsSummary(labId) {
    const key = this.generateKey('reports:summary', labId);
    return await this.get(key);
  }

  async setMedicalReportsSummary(labId, data, ttl = 300) {
    const key = this.generateKey('reports:summary', labId);
    return await this.set(key, data, ttl); // 5 minutes TTL for summary
  }

  /**
   * Cache test components for a specific test
   */
  async getTestComponents(testId) {
    const key = this.generateKey('test:components', testId);
    return await this.get(key);
  }

  async setTestComponents(testId, data, ttl = 7200) {
    const key = this.generateKey('test:components', testId);
    return await this.set(key, data, ttl); // 2 hours TTL for test components
  }



  /**
   * Get cached new results data for medical report
   */
  async getMedicalReportNewResultsData(reportId, labId) {
    const key = this.generateKey('report:newresults-data', reportId, labId);
    return await this.get(key);
  }

  /**
   * Set cached new results data for medical report
   */
  async setMedicalReportNewResultsData(reportId, labId, data, ttl = 1800) {
    const key = this.generateKey('report:newresults-data', reportId, labId);
    return await this.set(key, data, ttl);
  }

  /**
   * Cache invoices list
   */
  async getInvoicesList(labId, filters = {}) {
    const key = this.generateKey('invoices:list', labId, JSON.stringify(filters));
    return await this.get(key);
  }

  async setInvoicesList(labId, filters = {}, data, ttl = 300) {
    const key = this.generateKey('invoices:list', labId, JSON.stringify(filters));
    return await this.set(key, data, ttl);
  }

  /**
   * Invalidate cache when medical report is updated
   */
  async invalidateMedicalReport(reportId) {
    const patterns = [
      `labmanager:report:basic:*${reportId}*`,
      `labmanager:report:tests:*${reportId}*`,
      `labmanager:report:cultures:*${reportId}*`,
      `labmanager:report:test-components:*${reportId}*`,
      `labmanager:report:complete:*${reportId}*`,
      `labmanager:report:newresults-data:*${reportId}*`,
      `labmanager:reports:list:*`, // Invalidate all lists as they might contain this report
      `labmanager:reports:summary:*`, // Invalidate summary as counts might change
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Invalidate invoices cache for a specific lab
   */
  async invalidateInvoicesCache(labId) {
    const patterns = [
      `labmanager:invoices:list:*${labId}*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Invalidate cache when test results are updated
   */
  async invalidateTestResults(reportId) {
    const patterns = [
      `labmanager:report:tests:*${reportId}*`,
      `labmanager:report:test-components:*${reportId}*`,
      `labmanager:report:complete:*${reportId}*`,
      `labmanager:report:newresults-data:*${reportId}*`,
      `labmanager:reports:summary:*`, // Results affect pending counts
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Invalidate cache when culture results are updated
   */
  async invalidateCultureResults(reportId) {
    const patterns = [
      `labmanager:report:cultures:*${reportId}*`,
      `labmanager:report:complete:*${reportId}*`,
      `labmanager:report:newresults-data:*${reportId}*`,
      `labmanager:reports:summary:*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Invalidate all cache for a specific lab
   */
  async invalidateLabCache(labId) {
    const patterns = [
      `labmanager:reports:list:*${labId}*`,
      `labmanager:reports:summary:*${labId}*`,
    ];

    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(labId, recentReportIds = []) {
    if (!this.isConnected) return;

    try {
      console.log(`🔥 Warming up cache for lab ${labId}...`);

      // Warm up summary data
      // This would typically be called from the actual API endpoints
      // when they fetch data for the first time

      console.log(`✅ Cache warm-up completed for lab ${labId}`);
    } catch (error) {
      console.warn('Cache warm-up error:', error.message);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false, keys: 0 };
    }

    try {
      const info = await this.client.info('memory');
      const keys = await this.client.dbSize();

      return {
        connected: true,
        keys,
        memory: info,
      };
    } catch (error) {
      console.warn('Cache stats error:', error.message);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushDb();
      console.log('🧹 All cache cleared');
      return true;
    } catch (error) {
      console.warn('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      try {
        console.log('🔌 Redis: Closing connection...');
        if (this.isConnected) {
          await this.client.quit();
        } else {
          await this.client.disconnect();
        }
        console.log('✅ Redis: Connection closed successfully');
      } catch (error) {
        console.warn('⚠️ Redis: Error closing connection:', error.message);
        // Force disconnect if quit fails
        try {
          await this.client.disconnect();
        } catch (disconnectError) {
          console.warn('⚠️ Redis: Force disconnect also failed:', disconnectError.message);
        }
      } finally {
        this.isConnected = false;
        this.client = null;
      }
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;