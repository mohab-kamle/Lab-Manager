// Load environment variables
require("dotenv").config();

// 🔒 SECURITY CHECK: Ensure SECRET_KEY is defined
if (!process.env.SECRET_KEY) {
  console.error("FATAL ERROR: SECRET_KEY is not defined in environment variables.");
  console.error("Please set SECRET_KEY in your .env file to secure JWT tokens.");
  process.exit(1);
}

// Core dependencies
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const db = require("./models");
const authenticateUser = require("./middleware/authenticateUser");
const authorizeFileAccess = require("./middleware/authorizeFileAccess");
const { globalLimiter } = require("./middleware/rateLimiters");
const { employee, patient, phone_number, doctor } = require("./models");
const { getS3FileUrl } = require('./services/s3Service');

// Socket.io for Real-Time Events
const http = require("http");
const { Server } = require("socket.io");

// Subscription scheduler service
const { initializeSubscriptionScheduler, stopSubscriptionScheduler } = require('./services/subscriptionScheduler');

// Cache service
const cacheService = require('./services/cacheService');

// Inventory expiry checker
const { checkExpiringBatches } = require('./services/inventoryEvents');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Use stricter CORS in production
    methods: ["GET", "POST"]
  }
});
app.set("io", io); // Make it available to routes

// Trust first proxy (Cloudflare/Nginx) for correct IP rate limiting
app.set('trust proxy', 1);
const router = express.Router();

// =========================
// CORS Configuration
// =========================

// Configure the main domain - fallback to hardcoded default if not in env
const MAIN_DOMAIN = process.env.DOMAIN_NAME || 'labdoctors-laboratories.com';

// Securely check for subdomains using regex to prevent partial matches
// Matches https://MAIN_DOMAIN and any subdomains (e.g. https://api.MAIN_DOMAIN)
// The regex is constructed dynamically to allow configuration via environment variables
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const allowedDomainPattern = new RegExp(`^https:\/\/([a-zA-Z0-9-]+\\.)*${escapeRegExp(MAIN_DOMAIN)}$`);

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

    // In production, also allow any subdomain of the main domain
    if (process.env.NODE_ENV === 'production' && allowedDomainPattern.test(origin)) {
      console.log(`CORS: Allowing ${MAIN_DOMAIN} subdomain:`, origin);
      return callback(null, true);
    }

    // In development, allow dynamic localhost subdomains (e.g. test.localhost:5173)
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/([a-z0-9-]+\.)*localhost(:[0-9]+)?$/.test(origin)) {
      console.log('CORS: Allowing localhost subdomain:', origin);
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
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

// Apply specific large body limit only to WhatsApp report sending
app.use("/whatsapp/send-report", express.json({ limit: '50mb' }));

// Revert global limits to a safer default
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// Apply security headers with CSP for Socket.io
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      connectSrc: ["'self'", "http://localhost:3001", "ws://localhost:3001", "https://*.labdoctors-laboratories.com", "wss://*.labdoctors-laboratories.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Apply global rate limiter
app.use(globalLimiter);

// Compress responses
const compression = require('compression');
app.use(compression());

// Apply CORS to all routes
app.use(cors(corsOptions));

// Handle preflight requests explicitly for all routes
app.options('*', cors(corsOptions));

// =========================
// =========================
// S3 File Access Routes
// =========================

// Serve PRIVATE files with authentication (medical reports, patient documents) via S3
app.get('/uploads/private/:filename', authorizeFileAccess, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Map to S3 key
    const s3Key = `private/uploads/${filename}`;
    const s3Url = await getS3FileUrl(s3Key, false); // false = presigned URL for private
    
    // Return the pre-signed URL as JSON instead of a 302 redirect.
    // A redirect followed by XHR triggers S3 CORS checks.
    // The client assigns the URL directly to <img src>, which is not an XHR and bypasses CORS.
    res.json({ url: s3Url });
  } catch (error) {
    console.error('Error generating S3 presigned URL for private file:', error);
    res.status(500).json({ error: 'Failed to access file' });
  }
});

// Serve COMMENT IMAGES with authentication via S3
app.get('/uploads/comment-images/:filename', authorizeFileAccess, async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Map to S3 key
    const s3Key = `private/comment-images/${filename}`;
    const s3Url = await getS3FileUrl(s3Key, false); // false = presigned URL for private
    
    // Return the pre-signed URL as JSON instead of a 302 redirect.
    // A redirect followed by XHR triggers S3 CORS checks.
    // The client assigns the URL directly to <img src>, which is not an XHR and bypasses CORS.
    res.json({ url: s3Url });
  } catch (error) {
    console.error('Error generating S3 presigned URL for comment image:', error);
    res.status(500).json({ error: 'Failed to access comment image' });
  }
});

// 🔒 SECURITY FIX: Legacy support removed to prevent authorization bypass.
// All access to comment images must go through the authorized route above.
// Legacy support for existing comment-images REMOVED for security
// app.use('/uploads/comment-images', express.static(commentImagesPath, { ... }));
// Access is now strictly controlled via authenticated route above


// Headers for environment info
app.use((req, res, next) => {
  res.header('X-Powered-By', 'LabManager API');
  res.header('X-Environment', process.env.NODE_ENV || 'development');
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


// Database health check
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.sequelize.authenticate();

    // Test if key tables exist
    const tableChecks = await Promise.allSettled([
      db.test.count(),
      db.medical_report.count(),
      db.patient.count()
    ]);

    const tableStatus = {
      test: tableChecks[0].status === 'fulfilled' ? 'OK' : 'ERROR',
      medical_report: tableChecks[1].status === 'fulfilled' ? 'OK' : 'ERROR',
      patient: tableChecks[2].status === 'fulfilled' ? 'OK' : 'ERROR'
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
app.use("/doctor", require("./routes/doctor"));
app.use("/categories", require("./routes/categories"));
app.use("/tests", require("./routes/tests"));
app.use("/global-catalog", require("./routes/globalTestCatalog"));
app.use("/samples", require("./routes/samples"));
app.use("/payment-methods", require("./routes/paymentMethods"));
app.use("/subscriptions", require("./routes/subscriptions"));
app.use("/invoices", require("./routes/invoices"));
app.use("/branches", require("./routes/branches"));
app.use("/outsourced-labs", require("./routes/outsourcedLabs"));
app.use("/labs", require("./routes/labs"));
app.use("/packages-and-offers", require("./routes/packages_and_offers"));
app.use("/statuses", require("./routes/statuses"));
app.use("/medical-reports", require('./routes/medical_reports'));
app.use("/antibiotics", require('./routes/antibiotics'));
app.use("/admin", require('./routes/admin'));
app.use("/validate-admin-info", require("./routes/validateAdminInfo"));
app.use("/bill", require('./routes/bill'));
app.use("/diseases", require('./routes/diseases'));
app.use("/receptionists", require('./routes/receptionist'));

app.use("/suppliers", require("./routes/suppliers"));
app.use("/inventory", require("./routes/inventory"));
app.use("/questions", require("./routes/questions"));
app.use("/contracts", require("./routes/contracts"));
app.use("/demo", require("./routes/demo"));
app.use("/register", require("./routes/register"));
app.use("/payments", require("./routes/paymentsGateway"));
app.use("/subscription-scheduler", require("./routes/subscriptionScheduler"));
app.use("/analytics", require("./routes/analytics"));
app.use("/whatsapp", require("./routes/whatsapp.routes"));
app.use("/reconciliation", require("./routes/reconciliation"));

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
        const phones = await phone_number.findAll({ 
          where: { patient_id: req.user.id },
          attributes: ['phone', ['phone', 'phone_number'], 'type', 'is_primary']
        });
        user = { ...user.get(), role: "patient", phones };
      }
    } else if (req.user.role === "doctor") {
      user = await doctor.findByPk(req.user.id, {
        attributes: ["id", "name", "username", "email"]
      });
      // If role is not in db column yet (it is not in schema i think, usually derived), append it
      if (user) {
        user = user.toJSON();
        user.role = 'doctor';
      }
    } else {
      user = await employee.findByPk(req.user.id, {
        attributes: ["id", "name", "username", "role", "lab_id"],
        include: [
          {
            model: phone_number,
            as: 'phones',
            attributes: ['phone', ['phone', 'phone_number'], 'type', 'is_primary']
          }
        ]
      });
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
      console.log(process.env.testtestato);
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        console.error(`💥 All database connection attempts failed. Server will start without database sync.`);
        return false;
      }

      console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
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

    if (!isProduction) {
      console.log("🔧 Development mode: syncing database...");

      const forceSync = process.env.FORCE_SYNC === 'true';
      const syncOptions = forceSync ? { force: true } : { alter: true };

      if (forceSync) {
        console.log(`⚠️  WARNING: Force sync will drop all tables and recreate them!`);
        console.log(`⚠️  This will DELETE ALL DATA! Only use in development!`);
      }

      try {
        await db.sequelize.sync(syncOptions);
        console.log(`✅ Database schema synchronized successfully`);
      } catch (syncError) {
        console.error(`❌ Database sync error:`, syncError.message);
        console.log(`⚠️  Continuing with server startup despite sync issues...`);
      }
    } else {
      console.log("🚀 Production mode: skipping sequelize sync (using migrations)");
    }

    // Verify key tables exist
    const keyTables = ['patient', 'test', 'medical_report'];
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
      console.error("💡 Tip: Check your database credentials in config/config.js");
    } else if (error.message.includes('Unknown column')) {
      console.error("💡 Tip: This might be a schema mismatch. Consider using FORCE_SYNC=true in development");
    }

    return false;
  }
}

// safeSyncWithConstraintHandling removed as it is dangerous to sync individual models in production
// Start server with enhanced database sync
// Only sync database on master process in cluster mode to prevent race conditions
const shouldSyncDatabase = !process.env.pm_id || process.env.pm_id === '0';

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
  // Reference for the expiry check interval (set up after Socket.io handler below)
  let expiryCheckInterval = null;

  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    try {
      // Stop subscription scheduler
      if (subscriptionScheduler) {
        stopSubscriptionScheduler(subscriptionScheduler);
      }

      // Stop expiry check interval
      if (expiryCheckInterval) clearInterval(expiryCheckInterval);

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

      // Stop expiry check interval
      if (expiryCheckInterval) clearInterval(expiryCheckInterval);

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

  // Socket.io connection handling
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Track which labs have already had their expiry check this cycle
    socket.on("join_lab", (lab_id) => {
      socket.join(`lab_${lab_id}`);
      console.log(`🏠 Socket ${socket.id} joined lab_${lab_id}`);

      // Run expiry check for this lab once per cycle (first client to connect triggers it)
      if (!checkedLabs.has(lab_id)) {
        checkedLabs.add(lab_id);
        // Small delay to ensure the client has fully joined the room before we emit events
        setTimeout(() => checkExpiringBatches(io), 2000);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Track which labs have been checked for expiring batches this cycle
  // Resets every 24h so labs get re-checked daily
  let checkedLabs = new Set();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  expiryCheckInterval = setInterval(() => {
    checkedLabs.clear(); // Reset so next client connection triggers a fresh check
  }, TWENTY_FOUR_HOURS);
  console.log('🔔 Inventory expiry checker: runs on first client join per lab, resets every 24 hours');

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for production domains`);
    console.log(`🔧 Debug mode: ${!isProduction ? 'ON' : 'OFF'}`);
    console.log(` Database sync: ${isProduction ? 'DISABLED (using migrations)' : 'ENABLED (dev only)'}`);
    console.log(`🔌 Connection pool: max=${db.sequelize.config.pool?.max || 'default'}, min=${db.sequelize.config.pool?.min || 'default'}`);
    console.log(`🗄️ Redis cache: ${cacheService.isConnected ? 'CONNECTED' : 'DISCONNECTED (fallback to database)'}`);
    console.log(`⏰ Subscription auto-expiry: ENABLED (every 3 hours)`);
  });
}
