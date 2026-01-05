
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Set SECRET_KEY for testing
process.env.SECRET_KEY = 'test_secret_key';

// Mock middlewares
jest.mock('../middleware/authenticateUser', () => (req, res, next) => {
    // Mock user
    req.user = { id: 1, role: 'admin' };
    next();
});

jest.mock('../middleware/authorizeFileAccess', () => (req, res, next) => {
    const path = require('path');
    const fs = require('fs');
    const jwt = require('jsonwebtoken');

    // Determine the path to the mocked middleware
    const middlewarePath = path.join(__dirname, '../middleware/authorizeFileAccess.js');

    // Check if the middleware file exists
    if (!fs.existsSync(middlewarePath)) {
        console.error("Middleware file not found:", middlewarePath);
        return res.status(500).send("Internal Server Error: Middleware not found");
    }

    // Require the actual middleware
    const actualMiddleware = jest.requireActual('../middleware/authorizeFileAccess.js');

    // Mock jwt.verify to bypass authentication
    const originalJwtVerify = jwt.verify;
    jwt.verify = () => ({ role: 'admin', id: 1 }); // Mock decoded token

    // Call the actual middleware
    actualMiddleware(req, res, (err) => {
        // Restore jwt.verify
        jwt.verify = originalJwtVerify;
        if (err) return next(err);
        next();
    });
});

// Mock database models to avoid connection errors
jest.mock('../models', () => {
    const Sequelize = {
        Op: {
            eq: 'eq',
            like: 'like',
        }
    };

    return {
        sequelize: {
            authenticate: jest.fn(),
            sync: jest.fn(),
            models: {},
            query: jest.fn().mockResolvedValue([[], []]), // Mock query result
            transaction: jest.fn(callback => callback())
        },
        Sequelize: Sequelize,
        employee: { findByPk: jest.fn() },
        patient: { findByPk: jest.fn() },
        phone: { findAll: jest.fn() },
        medical_report: { findByPk: jest.fn() },
        lab: {},
        admin: {},
        lab_settings: {},
        subscription: {},
        lab_payment: {},
        test_group: { count: jest.fn().mockResolvedValue(0) },
        tgc_category: { count: jest.fn().mockResolvedValue(0) },
        test: { count: jest.fn().mockResolvedValue(0) },
        culture: { count: jest.fn().mockResolvedValue(0) }
    };
});

// Mock other services
jest.mock('../services/subscriptionScheduler', () => ({
    initializeSubscriptionScheduler: jest.fn(),
    stopSubscriptionScheduler: jest.fn()
}));

jest.mock('../services/cacheService', () => ({
    init: jest.fn(),
    close: jest.fn(),
    isConnected: false
}));

// Import the app
const app = require('../index');

describe('Path Traversal Vulnerability Fix Verification', () => {

    it('should BLOCK accessing files outside uploads directory', async () => {
        const traversalPath = '../../config/config.json';

        // Mock authorization header
        const res = await request(app)
            .get(`/uploads/private/${encodeURIComponent(traversalPath)}`)
            .set('Authorization', 'Bearer mocktoken');

        // We expect a 403 or 404 (not 200)

        if (res.status === 200) {
             // Fail if we can read the file
             console.log('VULNERABILITY STILL EXISTS: Can read config.json');
             throw new Error('Vulnerability still exists');
        } else {
             console.log(`Request blocked/failed with status ${res.status} (Expected behavior)`);
        }
    });

    it('should ALLOW accessing valid files inside private directory', async () => {
        // Create a dummy file in private uploads
        const privateUploadsPath = path.join(__dirname, '../uploads/private');
        if (!fs.existsSync(privateUploadsPath)) {
            fs.mkdirSync(privateUploadsPath, { recursive: true });
        }
        const testFile = 'test_verify_fix.txt';
        fs.writeFileSync(path.join(privateUploadsPath, testFile), 'secret content');

        const res = await request(app)
            .get(`/uploads/private/${testFile}`)
            .set('Authorization', 'Bearer mocktoken');

        if (res.status !== 200) {
            console.log(`Valid file access failed with status ${res.status}`);
            throw new Error('Valid file access failed');
        } else {
             console.log('Valid file access succeeded');
        }

        // Cleanup
        fs.unlinkSync(path.join(privateUploadsPath, testFile));
    });
});
