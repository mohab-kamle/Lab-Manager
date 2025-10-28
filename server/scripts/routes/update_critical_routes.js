const fs = require('fs');
const path = require('path');

/**
 * Update critical routes for multi-tenant support
 */
async function updateCriticalRoutes() {
    const routesDir = path.join(__dirname, '../routes');
    
    // Define critical routes that need immediate attention
    const criticalRoutes = [
        'patient.js',
        'invoices.js', 
        'medical_reports.js',
        'tests.js',
        'test_groups.js',
        'culture.js',
        'employee.js',
        'packages_and_offers.js',
        'contracts.js',
        'branches.js',
        'paymentMethods.js'
    ];

    console.log('Updating critical routes for multi-tenant support...');

    for (const file of criticalRoutes) {
        const filePath = path.join(routesDir, file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${file}`);
            continue;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        console.log(`Processing ${file}...`);

        // 1. Add tenantContext import if not present
        if (!content.includes('tenantContext')) {
            content = content.replace(
                /const authorizeRoles = require\("\.\.\/middleware\/authorizeRoles"\);/,
                'const authorizeRoles = require("../middleware/authorizeRoles");\nconst tenantContext = require("../middleware/tenantContext");'
            );
            updated = true;
        }

        // 2. Add tenantContext to main routes (skip login/register routes)
        const routePatterns = [
            // GET routes
            /router\.get\(['"`]([^'"`]+)['"`],\s*authenticateUser,\s*authorizeRoles\([^)]+\)\s*,?\s*async\s*\(/g,
            /router\.get\(['"`]([^'"`]+)['"`],\s*authenticateUser\s*,?\s*async\s*\(/g,
            
            // POST routes
            /router\.post\(['"`]([^'"`]+)['"`],\s*authenticateUser,\s*authorizeRoles\([^)]+\)\s*,?\s*async\s*\(/g,
            /router\.post\(['"`]([^'"`]+)['"`],\s*authenticateUser\s*,?\s*async\s*\(/g,
            
            // PUT routes
            /router\.put\(['"`]([^'"`]+)['"`],\s*authenticateUser,\s*authorizeRoles\([^)]+\)\s*,?\s*async\s*\(/g,
            /router\.put\(['"`]([^'"`]+)['"`],\s*authenticateUser\s*,?\s*async\s*\(/g,
            
            // DELETE routes
            /router\.delete\(['"`]([^'"`]+)['"`],\s*authenticateUser,\s*authorizeRoles\([^)]+\)\s*,?\s*async\s*\(/g,
            /router\.delete\(['"`]([^'"`]+)['"`],\s*authenticateUser\s*,?\s*async\s*\(/g
        ];

        const skipRoutes = ['/login', '/register', '/auth', '/health', '/status'];

        for (const pattern of routePatterns) {
            content = content.replace(pattern, (match, routePath) => {
                if (skipRoutes.some(skip => routePath.includes(skip))) {
                    return match; // Don't modify login/register routes
                }
                
                if (match.includes('tenantContext')) {
                    return match; // Already has tenantContext
                }
                
                // Add tenantContext before async
                return match.replace('async (', 'tenantContext, async (');
            });
        }

        // 3. Add lab_id to database queries
        const models = [
            'patient', 'bill', 'medical_report', 'employee', 'contract', 
            'packages_and_offers', 'payment_method', 'company', 'doctor',
            'receptionist', 'chemist', 'admin', 'test', 'culture', 'test_group'
        ];

        for (const model of models) {
            // Update findAll queries
            const findAllPattern = new RegExp(
                `(${model}\\.findAll\\(\\{[^}]*where:\\s*\\{[^}]*\\}[^}]*\\})`,
                'g'
            );
            
            content = content.replace(findAllPattern, (match, query) => {
                if (query.includes('lab_id')) return match; // Already has lab_id
                
                // Add lab_id to where clause
                return query.replace(
                    /where:\s*\{([^}]*)\}/,
                    'where: { $1, lab_id: req.tenant.lab_id }'
                );
            });

            // Update findOne queries
            const findOnePattern = new RegExp(
                `(${model}\\.findOne\\(\\{[^}]*where:\\s*\\{[^}]*\\}[^}]*\\})`,
                'g'
            );
            
            content = content.replace(findOnePattern, (match, query) => {
                if (query.includes('lab_id')) return match; // Already has lab_id
                
                // Add lab_id to where clause
                return query.replace(
                    /where:\s*\{([^}]*)\}/,
                    'where: { $1, lab_id: req.tenant.lab_id }'
                );
            });

            // Update create queries to include lab_id
            const createPattern = new RegExp(
                `(${model}\\.create\\(\\{[^}]*\\}\\))`,
                'g'
            );
            
            content = content.replace(createPattern, (match, query) => {
                if (query.includes('lab_id')) return match; // Already has lab_id
                
                // Add lab_id to create object
                return query.replace(
                    /(\{[^}]*\})/,
                    '$1, lab_id: req.tenant.lab_id'
                );
            });
        }

        // 4. Update raw SQL queries to include lab_id
        const sqlPatterns = [
            // SELECT queries
            /(SELECT[^;]+FROM\s+(\w+)\s+[^;]+)(ORDER BY|GROUP BY|WHERE|;)/gi,
            // UPDATE queries
            /(UPDATE\s+(\w+)\s+SET[^;]+)(WHERE|;)/gi
        ];

        for (const pattern of sqlPatterns) {
            content = content.replace(pattern, (match, query, table, ending) => {
                if (query.includes('lab_id')) return match; // Already has lab_id
                
                // Add WHERE clause with lab_id if not present
                if (ending === ';') {
                    return `${query} WHERE ${table}.lab_id = :labId;`;
                } else if (ending.startsWith('WHERE')) {
                    return `${query} AND ${table}.lab_id = :labId ${ending}`;
                } else {
                    return `${query} WHERE ${table}.lab_id = :labId ${ending}`;
                }
            });
        }

        // 5. Update sequelize.query calls to include labId parameter
        const queryPattern = /sequelize\.query\([^,]+,\s*\{[^}]*type:\s*sequelize\.QueryTypes\.\w+[^}]*\}\)/g;
        
        content = content.replace(queryPattern, (match) => {
            if (match.includes('labId')) return match; // Already has labId
            
            return match.replace(
                /\{([^}]*type:\s*sequelize\.QueryTypes\.\w+[^}]*)\}/,
                '{ $1, replacements: { ...$1.replacements, labId: req.tenant.lab_id } }'
            );
        });

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated ${file}`);
        } else {
            console.log(`→ No changes needed for ${file}`);
        }
    }

    console.log('✅ Critical routes updated for multi-tenant support!');
}

// Run the update if this script is executed directly
if (require.main === module) {
    updateCriticalRoutes();
}

module.exports = updateCriticalRoutes; 