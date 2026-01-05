// Load environment variables
require("dotenv").config();

// Core dependencies
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const db = require("./models");
const authenticateUser = require("./middleware/authenticateUser");
const authorizeFileAccess = require("./middleware/authorizeFileAccess");
const { employee, patient, phone } = require("./models");

// Subscription scheduler service
const { initializeSubscriptionScheduler, stopSubscriptionScheduler } = require('./services/subscriptionScheduler');

// Cache service
const cacheService = require('./services/cacheService');

// Initialize Express app
const app = express();
const router = express.Router();

// =========================
// CORS Configuration
// =========================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: No origin provided, allowing');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'https://mlab-manager.vercel.app',
      'https://www.labdoctors-laboratories.com',
      'https://labdoctors-laboratories.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    // In production, also allow any subdomain of labdoctors-laboratories.com
    if (process.env.NODE_ENV === 'production' && origin.includes('labdoctors-laboratories.com')) {
      console.log('CORS: Allowing labdoctors-laboratories.com subdomain:', origin);
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);

      // In development, we might want to be more lenient, but for security we should block unknown origins
      // If you are developing locally and your origin is blocked, add it to allowedOrigins

      if (process.env.NODE_ENV !== 'production') {
        // Warn but allow in non-production if needed, or better yet, block it to enforce security
        console.warn('CORS: WARNING - Allowing blocked origin in non-production environment:', origin);
        callback(null, true);
      } else {
        // Block in production
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Key'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

app.use(express.json());

// Apply security headers
app.use(helmet());

// Compress responses
const compression = require('compression');
app.use(compression());

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// =========================
// Static File Serving
// =========================
// Serve uploaded files (images, documents, etc.)
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const uploadsPath = path.join(__dirname, 'uploads');
const publicUploadsPath = path.join(uploadsPath, 'public');
const privateUploadsPath = path.join(uploadsPath, 'private');
const commentImagesPath = path.join(uploadsPath, 'comment-images');

// Create directory structure
[uploadsPath, publicUploadsPath, privateUploadsPath, commentImagesPath].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('📁 Created directory:', dir);
  }
});

// Serve PUBLIC files without authentication (avatars, logos, etc.)
app.use('/uploads/public', express.static(publicUploadsPath, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set appropriate headers for different file types
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/' + filePath.split('.').pop());
    }
    // Add CORS headers for uploaded files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Serve PRIVATE files with authentication (medical reports, patient documents)
app.get('/uploads/private/:filename', authorizeFileAccess, (req, res) => {
  const filename = req.params.filename;

  // Security check: Prevent path traversal
  const safeFilename = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(privateUploadsPath, safeFilename);

  // Verify the resolved path is still within the private directory
  if (!filePath.startsWith(privateUploadsPath)) {
    console.error(`Security Alert: Path traversal attempt blocked. IP: ${req.ip}, User: ${req.user ? req.user.id : 'unknown'}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set appropriate headers
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    res.setHeader('Content-Type', `image/${ext.substring(1)}`);
  } else if (ext === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
  }
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
  
  res.sendFile(filePath);
});

// Serve COMMENT IMAGES with authentication
app.get('/uploads/comment-images/:filename', authorizeFileAccess, (req, res) => {
  const filename = req.params.filename;

  // Security check: Prevent path traversal
  const safeFilename = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(commentImagesPath, safeFilename);

  // Verify the resolved path is still within the comment images directory
  if (!filePath.startsWith(commentImagesPath)) {
    console.error(`Security Alert: Path traversal attempt blocked. IP: ${req.ip}, User: ${req.user ? req.user.id : 'unknown'}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set appropriate headers for images
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    res.setHeader('Content-Type', `image/${ext.substring(1)}`);
  }
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
  
  res.sendFile(filePath);
});

// Legacy support for existing comment-images (maintain backward compatibility)
app.use('/uploads/comment-images', express.static(commentImagesPath, {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/' + filePath.split('.').pop());
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

console.log('📁 Secure file serving configured:');
console.log('  - Public files: /uploads/public (no auth required)');
console.log('  - Private files: /uploads/private (auth required)');
console.log('  - Comment images: /uploads/comment-images (auth required)');

// Railway-specific CORS handling
app.use((req, res, next) => {
  // Railway sometimes requires specific headers
  res.header('X-Powered-By', 'LabManager API');
  res.header('X-Environment', process.env.NODE_ENV || 'development');
  
  // Ensure CORS headers are set for Railway
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
  }
  
  next();
});

// Additional CORS headers for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    res.status(204).end();
    return;
  }
  
  next();
});

// Add CORS debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'} - User-Agent: ${req.headers['user-agent'] || 'No user-agent'}`);
  
  // Log CORS headers for debugging
  if (req.method === 'OPTIONS') {
    console.log('CORS Preflight Request Headers:', {
      'Access-Control-Request-Method': req.headers['access-control-request-method'],
      'Access-Control-Request-Headers': req.headers['access-control-request-headers'],
      'Origin': req.headers.origin
    });
  }
  
  next();
});

// =========================
// Health Check Route
// =========================
app.get('/', (req, res) => {
  res.send('LabManager API is running!');
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
      'access-control-allow-headers': res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// Railway-specific health check
app.get('/railway-health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      allowed: true
    }
  });
});


// Database health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    
    // Test if key tables exist
    const tableChecks = await Promise.allSettled([
      db.test_group.count(),
      db.tgc_category.count(),
      db.test.count(),
      db.culture.count(),
      db.patient.count()
    ]);
    
    const tableStatus = {
      test_group: tableChecks[0].status === 'fulfilled' ? 'OK' : 'ERROR',
      tgc_category: tableChecks[1].status === 'fulfilled' ? 'OK' : 'ERROR',
      test: tableChecks[2].status === 'fulfilled' ? 'OK' : 'ERROR',
      culture: tableChecks[3].status === 'fulfilled' ? 'OK' : 'ERROR',
      patient: tableChecks[4].status === 'fulfilled' ? 'OK' : 'ERROR'
    };
    
    res.json({
      status: 'OK',
      database: 'Connected',
      tables: tableStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
// detailed Health check
// app.get('/health/detailed', async (req, res) => {
//   const health = {
//     memory: process.memoryUsage(),
//     uptime: process.uptime(),
//     connections: getActiveConnections()
//   };
//   res.json(health);
// });

// =========================
// Routers
// =========================
app.use("/me", router);
app.use("/patient", require("./routes/patient"));
app.use("/emp", require("./routes/employee"));
app.use("/categories", require("./routes/categories"));
app.use("/tests", require("./routes/tests"));
app.use("/samples", require("./routes/samples"));
app.use("/cultures", require("./routes/culture"));
app.use("/culture-options", require("./routes/cultureOptions"));
app.use("/culture-sub-options", require("./routes/cultureSubOptions"));
app.use("/antibiotics", require("./routes/antibiotics"));
app.use("/payment-methods", require("./routes/paymentMethods"));
app.use("/subscriptions", require("./routes/subscriptions"));
app.use("/invoices", require("./routes/invoices"));
app.use("/branches", require("./routes/branches"));
app.use("/labs", require("./routes/labs"));
app.use("/packages-and-offers", require("./routes/packages_and_offers"));
app.use("/statuses", require("./routes/statuses"));
app.use("/medical-reports", require('./routes/medical_reports'));
app.use("/admin", require('./routes/admin'));
app.use("/validate-admin-info", require("./routes/validateAdminInfo"));
app.use("/bill", require('./routes/bill'));
app.use("/diseases", require('./routes/diseases'));
app.use("/receptionists", require('./routes/receptionist'));
app.use("/referrals", require('./routes/referrals'));
app.use("/tgc-categories", require("./routes/tgc_categories"));
app.use("/test-groups", require("./routes/test_groups"));
app.use("/questions", require("./routes/questions"));
app.use("/contracts", require("./routes/contracts"));
app.use("/culture-antibiotics", require("./routes/culture_antibiotics"));
app.use("/field-comp-options", require("./routes/field_comp_options"));
app.use("/demo", require("./routes/demo"));
app.use("/register", require("./routes/register"));
app.use("/payments", require("./routes/paymentsGateway"));
app.use("/subscription-scheduler", require("./routes/subscriptionScheduler"));

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.message === 'Not allowed by CORS') {
    console.error('CORS Error Details:', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    return res.status(403).json({ 
      error: 'CORS Error', 
      message: 'Origin not allowed',
      origin: req.headers.origin 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message 
  });
});

// =========================
// Authenticated User Info
// =========================
router.get("/", authenticateUser, async (req, res) => {
  try {
    let user;
    if (req.user.role === "patient") {
      user = await patient.findByPk(req.user.id, {
        attributes: [
          "id", "patientcode", "name", "birth_date", "email", "national_id", "nationality", "passport_no", "gender", "address"
        ],
      });
      if (user) {
        const phones = await phone.findAll({ where: { patient_id: req.user.id } });
        user = { ...user.get(), role: "patient", phones };
      }
    } else {
      user = await employee.findByPk(req.user.id, { attributes: ["id", "name", "username", "role"] });
    }
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Database Connection & Server Start
// =========================
const isProduction = process.env.NODE_ENV === "production";

// Log environment information
console.log('Environment Information:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('- Railway Environment:', process.env.RAILWAY_ENVIRONMENT || 'Not set');
console.log('- Railway Service Name:', process.env.RAILWAY_SERVICE_NAME || 'Not set');
console.log('- CORS Origins:', [
  'https://mlab-manager.vercel.app',
  'https://www.labdoctors-laboratories.com',
  'https://labdoctors-laboratories.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].join(', '));

// Enhanced database connection with retry logic
async function connectDatabase() {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 Database connection attempt ${attempt}/${maxRetries}...`);
      await db.sequelize.authenticate();
      console.log(`✅ Database connection established successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`💥 All database connection attempts failed. Server will start without database sync.`);
        return false;
      }
      
      console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Enhanced database synchronization function
async function syncDatabase() {
  try {
    console.log(`🔌 Connecting to ${isProduction ? "Production" : "Development"} Database...`);
    const connected = await connectDatabase();
    
    if (!connected) {
      console.log(`⚠️  Database connection failed, skipping sync`);
      return false;
    }
    
    // Check if we should force sync (only in development)
    const forceSync = process.env.FORCE_SYNC === 'true' && !isProduction;
    const alterSync = !forceSync; // Use alter by default, force only if explicitly set
    
    const syncOptions = alterSync ? { alter: false } : { force: true };
    
    console.log(`🔄 Database synchronization mode: ${alterSync ? 'ALTER (safe)' : 'FORCE (destructive)'}`);
    console.log(`📋 Sync options:`, syncOptions);
    
    if (forceSync) {
      console.log(`⚠️  WARNING: Force sync will drop all tables and recreate them!`);
      console.log(`⚠️  This will DELETE ALL DATA! Only use in development!`);
    }
    
    // Try to sync, but handle various constraint issues gracefully
    try {
      await db.sequelize.sync(syncOptions);
      console.log(`✅ Database schema synchronized successfully`);
    } catch (syncError) {
      console.log(`🔧 Sync error detected: ${syncError.message}`);
      
      if (syncError.message.includes('Multiple primary key defined') || syncError.code === 'ER_MULTIPLE_PRI_KEY') {
        console.log(`🔧 Primary key conflict detected, applying manual fix...`);
        await fixPrimaryKeyConflict();
        console.log(`✅ Primary key conflict resolved, continuing with sync...`);
        // Try sync again after the fix
        await db.sequelize.sync(syncOptions);
        console.log(`✅ Database schema synchronized successfully after fix`);
      } else if (syncError.name === 'SequelizeUnknownConstraintError' || syncError.message.includes('does not exist') || syncError.code === 'ER_TOO_MANY_KEYS') {
        console.log(`🔧 Constraint issue detected, attempting individual model sync...`);
        
        // Try to sync models individually to handle constraint issues
        const models = Object.values(db.sequelize.models);
        let syncSuccess = true;
        
        for (const model of models) {
          try {
            console.log(`  🔄 Syncing model: ${model.name}`);
            await model.sync({ alter: true, force: false });
            console.log(`  ✅ Successfully synced: ${model.name}`);
          } catch (modelError) {
            console.error(`  ❌ Error syncing ${model.name}:`, modelError.message);
            
            // If it's a constraint error, log it but continue
            if (modelError.name === 'SequelizeUnknownConstraintError' || modelError.code === 'ER_TOO_MANY_KEYS') {
              console.log(`  ⚠️  Constraint issue with ${model.name}, skipping...`);
            } else {
              syncSuccess = false;
            }
          }
        }
        
        if (syncSuccess) {
          console.log(`✅ Individual model sync completed successfully`);
        } else {
          console.log(`⚠️  Some models failed to sync, but continuing...`);
        }
      } else {
        // For other errors, log but don't crash
        console.error(`❌ Database sync error:`, syncError.message);
        console.log(`⚠️  Continuing with server startup despite sync issues...`);
      }
    }
    
    // Verify key tables exist
    const keyTables = ['patient', 'test', 'culture', 'medical_report', 'test_group'];
    const tableChecks = await Promise.allSettled(
      keyTables.map(table => db.sequelize.query(`SELECT 1 FROM ${table} LIMIT 1`))
    );
    
    const tableStatus = {};
    keyTables.forEach((table, index) => {
      tableStatus[table] = tableChecks[index].status === 'fulfilled' ? '✅' : '❌';
    });
    
    console.log(`📊 Table verification:`, tableStatus);
    
    // Check for any failed table verifications
    const failedTables = keyTables.filter((table, index) => tableChecks[index].status === 'rejected');
    if (failedTables.length > 0) {
      console.warn(`⚠️  Warning: Some tables may not be accessible:`, failedTables);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Database synchronization failed:", error);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error("💡 Tip: Make sure your database server is running");
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("💡 Tip: Check your database credentials in config/config.json");
    } else if (error.message.includes('Unknown column')) {
      console.error("💡 Tip: This might be a schema mismatch. Consider using FORCE_SYNC=true in development");
    } else if (error.message.includes('Multiple primary key defined')) {
      console.error("💡 Tip: Primary key conflict detected. This has been automatically fixed.");
    }
    
    return false;
  }
}

// Safe sync function to handle constraint issues
async function safeSyncWithConstraintHandling() {
  try {
    console.log(`🔧 Applying safe sync with constraint handling...`);
    
    // Get all models
    const models = Object.values(db.sequelize.models);
    
    for (const model of models) {
      try {
        console.log(`  🔄 Syncing model: ${model.name}`);
        
        // Use alter: true to modify existing tables instead of dropping them
        await model.sync({ alter: true, force: false });
        
        console.log(`  ✅ Successfully synced: ${model.name}`);
      } catch (modelError) {
        console.error(`  ❌ Error syncing ${model.name}:`, modelError.message);
        
        // If it's a constraint error, try to handle it gracefully
        if (modelError.name === 'SequelizeUnknownConstraintError') {
          console.log(`  🔧 Attempting to fix constraint issue for ${model.name}...`);
          
          try {
            // Try to sync without constraints first
            await model.sync({ alter: true, force: false });
            console.log(`  ✅ Successfully synced ${model.name} after constraint fix`);
          } catch (retryError) {
            console.error(`  ❌ Failed to sync ${model.name} even after constraint fix:`, retryError.message);
          }
        }
      }
    }
    
    console.log(`✅ Safe sync with constraint handling completed!`);
    
  } catch (error) {
    console.error(`❌ Error during safe sync:`, error);
    throw error;
  }
}

// Direct fix for primary key conflict
async function fixPrimaryKeyConflict() {
  try {
    console.log(`🔧 Applying direct primary key conflict fix...`);
    
    // Step 1: Check if table exists
    const [tables] = await db.sequelize.query("SHOW TABLES LIKE 'medical_report_has_culture'");
    if (tables.length === 0) {
      console.log(`✅ Table doesn't exist, will be created by sync`);
      return;
    }
    
    // Step 2: Check current structure
    const [columns] = await db.sequelize.query("SHOW COLUMNS FROM medical_report_has_culture");
    const hasPrimaryKey = columns.some(col => col.Key === 'PRI');
    const hasIdColumn = columns.some(col => col.Field === 'id');
    
    console.log(`📊 Current structure: hasPrimaryKey=${hasPrimaryKey}, hasIdColumn=${hasIdColumn}`);
    
    // Step 3: Handle sql_require_primary_key constraint by recreating table
    console.log(`🔄 Recreating table to handle sql_require_primary_key constraint...`);
    
    // Create backup table
    await db.sequelize.query("CREATE TABLE medical_report_has_culture_backup AS SELECT * FROM medical_report_has_culture");
    console.log(`✅ Created backup table`);
    
    // Drop original table
    await db.sequelize.query("DROP TABLE medical_report_has_culture");
    console.log(`✅ Dropped original table`);
    
    // Recreate with correct structure
    await db.sequelize.query(`
      CREATE TABLE medical_report_has_culture (
        id int NOT NULL AUTO_INCREMENT,
        medical_report_id int NOT NULL,
        culture_id int NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_medical_report_culture (medical_report_id, culture_id),
        KEY idx_medical_report_id (medical_report_id),
        KEY idx_culture_id (culture_id)
      )
    `);
    console.log(`✅ Recreated table with correct structure`);
    
    // Copy data back
    await db.sequelize.query(`
      INSERT INTO medical_report_has_culture (medical_report_id, culture_id, created_at, updated_at)
      SELECT medical_report_id, culture_id, created_at, updated_at 
      FROM medical_report_has_culture_backup
    `);
    console.log(`✅ Copied data back from backup`);
    
    // Drop backup table
    await db.sequelize.query("DROP TABLE medical_report_has_culture_backup");
    console.log(`✅ Dropped backup table`);
    
    console.log(`✅ Primary key conflict fix completed`);
    
  } catch (error) {
    console.error(`❌ Error in primary key conflict fix:`, error.message);
    throw error;
  }
}


// Start server with enhanced database sync
// Only sync database on master process in cluster mode to prevent race conditions
const shouldSyncDatabase = !process.env.pm_id || process.env.pm_id === '0';

// Check if run directly
if (require.main === module) {
  if (shouldSyncDatabase) {
    console.log('🔧 Master process - performing database synchronization...');
    syncDatabase()
      .then(async () => {
        await startServer();
      })
      .catch((error) => {
        console.error("❌ Server startup failed:", error);
        process.exit(1);
      });
  } else {
    console.log('👷 Worker process - skipping database sync, starting server directly...');
    startServer().catch((error) => {
      console.error('❌ Server startup failed:', error);
      process.exit(1);
    });
  }
}

module.exports = app;

// Extract server startup logic into a separate function
async function startServer() {
  const PORT = process.env.PORT || 3001;
    
    // Add connection pool monitoring (using a different approach)
    if (db.sequelize.connectionManager) {
      console.log('🔌 Database connection pool initialized');
      console.log(`📊 Pool config: max=${db.sequelize.config.pool?.max || 'default'}, min=${db.sequelize.config.pool?.min || 'default'}`);
    }
    
    // Initialize Redis cache service
    try {
      await cacheService.init();
      console.log('🗄️ Redis cache service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Redis cache service:', error);
    }
    
    // Initialize subscription scheduler after database is ready
    let subscriptionScheduler;
    try {
      subscriptionScheduler = initializeSubscriptionScheduler();
      console.log('⏰ Subscription scheduler initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize subscription scheduler:', error);
    }
    
    // Add graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      try {
        // Stop subscription scheduler
        if (subscriptionScheduler) {
          stopSubscriptionScheduler(subscriptionScheduler);
        }
        
        // Close Redis cache connection
        await cacheService.close();
        
        // Close database connections
        await db.sequelize.close();
        console.log('✅ All connections closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      try {
        // Stop subscription scheduler
        if (subscriptionScheduler) {
          stopSubscriptionScheduler(subscriptionScheduler);
        }
        
        // Close Redis cache connection
        await cacheService.close();
        
        // Close database connections
        await db.sequelize.close();
        console.log('✅ All connections closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 CORS enabled for production domains`);
      console.log(`🔧 Debug mode: ${!isProduction ? 'ON' : 'OFF'}`);
      console.log(`🚂 Railway deployment: ${process.env.RAILWAY_ENVIRONMENT ? 'YES' : 'NO'}`);
      console.log(`📊 Database sync: ENABLED`);
      console.log(`🔌 Connection pool: max=${db.sequelize.config.pool?.max || 'default'}, min=${db.sequelize.config.pool?.min || 'default'}`);
      console.log(`🗄️ Redis cache: ${cacheService.isConnected ? 'CONNECTED' : 'DISCONNECTED (fallback to database)'}`);
      console.log(`⏰ Subscription auto-expiry: ENABLED (every 3 hours)`);
    });
  }
