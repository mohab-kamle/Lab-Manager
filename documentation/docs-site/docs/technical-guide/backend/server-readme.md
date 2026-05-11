# LabManager Server Documentation

## Overview

The LabManager server is a Node.js/Express.js backend API that provides comprehensive laboratory management functionality. It handles authentication, data management, medical reports, billing, and administrative operations for a multi-role laboratory system.

## Technology Stack

### Core Technologies

- **Node.js** - JavaScript runtime
- **Express.js 4.21.2** - Web framework
- **Sequelize 6.37.5** - ORM for database operations
- **MySQL2 3.12.0** - MySQL database driver
- **JWT 9.0.2** - JSON Web Token authentication

### Security & Authentication

- **bcryptjs 2.4.3** - Password hashing
- **jsonwebtoken 9.0.2** - JWT token generation/validation
- **CORS** - Cross-origin resource sharing

### File Handling

- **Multer 2.0.1** - File upload middleware
- **XLSX 0.18.5** - Excel file processing

### Utilities

- **dotenv 16.4.7** - Environment variable management
- **Commander 12.0.0** - CLI argument parsing
- **Nodemon 3.1.9** - Development server with auto-restart

## Project Structure

```
server/
├── config/                 # Database configuration
│   └── config.js        # Sequelize configuration
├── middleware/            # Express middleware
│   ├── authenticateUser.js
│   └── authorizeRoles.js
├── migrations/            # Database migrations
│   ├── 20240609_unify_status_enum_medical_report_tables.sql
│   ├── 20250115_add_new_fields_to_models.sql
│   ├── 20250708_add_price_to_test_group.sql
│   ├── 20250708_create_bill_has_tg.sql
│   ├── 20250708005126-create_test_group_schema.js
│   ├── add_bill_id_to_medical_report.sql
│   ├── add_deleted_at_to_test_group_safe.sql
│   ├── add_deleted_at_to_test_group.sql
│   ├── add_discount_amount_to_contract.sql
│   ├── add_name_to_contract.sql
│   ├── add_price_fields_to_bill_junction_tables.sql
│   ├── add_reference_range_to_tg_component.sql
│   ├── add_timestamps_manual.sql
│   ├── add_timestamps_safe.sql
│   ├── add_timestamps.sql
│   ├── add_zone_size_to_culture_antibiotic.sql
│   ├── complete_antibiotic_sensitivity_migration.sql
│   ├── create_medical_report_has_culture_antibiotic.sql
│   ├── create_medical_report_has_culture.sql
│   ├── remove_tg_id_from_medical_report_has_tg.sql
│   ├── update_medical_report_has_culture_structure.sql
│   ├── update_medical_report_has_test_status.sql
│   └── update_test_component_normal_range.sql
├── models/               # Sequelize models
│   ├── admin.js
│   ├── admin_packages_and_offers.js
│   ├── antibiotic.js
│   ├── bill.js
│   ├── bill_has_culture.js
│   ├── bill_has_package.js
│   ├── bill_has_payment_method.js
│   ├── bill_has_test.js
│   ├── bill_has_tg.js
│   ├── branch.js
│   ├── branch_has_employee.js
│   ├── categories_test_and_culture.js
│   ├── chemist.js
│   ├── company.js
│   ├── contract.js
│   ├── contract_has_culture.js
│   ├── contract_has_test.js
│   ├── culture.js
│   ├── culture_option.js
│   ├── diseases.js
│   ├── doctor.js
│   ├── employee.js
│   ├── field_comp_options.js
│   ├── index.js
│   ├── init-models.js
│   ├── lab.js
│   ├── lab_contracts_company.js
│   ├── lab_contracts_doctor.js
│   ├── medical_report.js
│   ├── medical_report_has_culture.js
│   ├── medical_report_has_culture_antibiotic.js
│   ├── medical_report_has_test.js
│   ├── medical_report_has_tg.js
│   ├── medical_report_tg_field_value.js
│   ├── packages_and_offers.js
│   ├── pao_has_culture.js
│   ├── pao_has_test.js
│   ├── patient.js
│   ├── patient_has_diseases.js
│   ├── payment_method.js
│   ├── phone.js
│   ├── question.js
│   ├── receptionist.js
│   ├── sample_type.js
│   ├── status.js
│   ├── test.js
│   ├── test_component.js
│   ├── test_group.js
│   ├── test_has_question.js
│   ├── tg_component.js
│   ├── tg_fields.js
│   └── tgc_category.js
├── routes/              # API route handlers
│   ├── admin.js
│   ├── antibiotics.js
│   ├── bill.js
│   ├── branches.js
│   ├── categories.js
│   ├── contracts.js
│   ├── culture.js
│   ├── culture_antibiotics.js
│   ├── cultureOptions.js
│   ├── diseases.js
│   ├── employee.js
│   ├── invoices.js
│   ├── labs.js
│   ├── medical_reports.js
│   ├── packages_and_offers.js
│   ├── patient.js
│   ├── paymentMethods.js
│   ├── questions.js
│   ├── receptionist.js
│   ├── sample.js
│   ├── samples.js
│   ├── statuses.js
│   ├── test_groups.js
│   ├── tests.js
│   └── tgc_categories.js
├── scripts/            # Utility scripts
│   ├── checkTokenExpiration.js
│   ├── debugChemistAccess.js
│   ├── hash.js
│   ├── runMigration.js
│   ├── runMigrations.js
│   ├── seedAdmin.js
│   ├── setupDatabase.js
│   ├── testChemistAccess.js
│   └── testEmployeeSystem.js
├── uploads/           # File upload directory
├── index.js          # Main server file
├── package.json      # Dependencies and scripts
├── syncDatabase.js   # Database synchronization
├── Dockerfile        # Docker configuration
└── .sequelizerc      # Sequelize configuration
```

## Database Architecture

### Core Entities

#### User Management

- **admin** - System administrators
- **chemist** - Laboratory chemists
<<<<<<< HEAD
- **doctor** - Medical doctors
=======
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
- **employee** - General employees
- **patient** - Patients
- **receptionist** - Front desk staff

#### Laboratory Operations

- **test** - Medical tests
- **test_group** - Grouped tests
- **test_component** - Individual test components
- **culture** - Bacterial cultures
- **culture_option** - Culture options
- **antibiotic** - Antibiotics for sensitivity testing
- **sample_type** - Types of samples

#### Medical Reports

- **medical_report** - Main report entity
- **medical_report_has_test** - Test results
- **medical_report_has_culture** - Culture results
- **medical_report_has_culture_antibiotic** - Antibiotic sensitivity
- **medical_report_has_tg** - Test group results
- **medical_report_tg_field_value** - Test group field values

#### Billing & Financial

- **bill** - Invoices
- **bill_has_test** - Tests in bills
- **bill_has_culture** - Cultures in bills
- **bill_has_tg** - Test groups in bills
- **bill_has_package** - Packages in bills
- **bill_has_payment_method** - Payment methods
- **payment_method** - Available payment methods

#### Administrative

- **branch** - Laboratory branches
- **branch_has_employee** - Employee assignments
- **company** - Contracted companies
- **contract** - Service contracts
- **contract_has_test** - Tests in contracts
- **contract_has_culture** - Cultures in contracts
- **packages_and_offers** - Service packages
- **pao_has_test** - Tests in packages
- **pao_has_culture** - Cultures in packages

#### Supporting Entities

- **categories_test_and_culture** - Test/culture categories
- **diseases** - Medical conditions
- **patient_has_diseases** - Patient disease history
- **phone** - Contact information
- **question** - Test questions
- **test_has_question** - Questions for tests
- **status** - System statuses
- **tgc_category** - Test group categories
- **tg_fields** - Test group fields
- **tg_component** - Test group components

## API Endpoints

### Authentication

- `POST /login` - User login
- `GET /me` - Get current user info
- `POST /logout` - User logout

### Health Checks

- `GET /` - Basic health check
- `GET /health` - Database health check
- `GET /cors-test` - CORS test endpoint

### User Management

- `GET /admin` - Admin operations
- `GET /patient` - Patient operations
- `GET /employee` - Employee operations
- `GET /receptionist` - Receptionist operations

### Medical Reports

- `GET /medical-reports` - List reports
- `POST /medical-reports` - Create report
- `GET /medical-reports/:id` - Get specific report
- `PUT /medical-reports/:id` - Update report
- `DELETE /medical-reports/:id` - Delete report

### Laboratory Operations

- `GET /tests` - List tests
- `POST /tests` - Create test
- `GET /cultures` - List cultures
- `POST /cultures` - Create culture
- `GET /antibiotics` - List antibiotics
- `GET /test-groups` - List test groups

### Billing & Invoices

- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /bills` - List bills
- `POST /bills` - Create bill

### Administrative

- `GET /branches` - List branches
- `GET /categories` - List categories
- `GET /packages-and-offers` - List packages
- `GET /payment-methods` - List payment methods

## Authentication & Authorization

### JWT Implementation

- **Token Structure**: `{ id, role, iat, exp }`
- **Secret Key**: Environment variable `SECRET_KEY`
- **Expiration**: Configurable token lifetime

### Middleware

- **authenticateUser.js**: Validates JWT tokens
- **authorizeRoles.js**: Role-based access control

### User Roles & Permissions

1. **admin** - Full system access
<<<<<<< HEAD
2. **doctor** - Medical report access, patient data
3. **chemist** - Laboratory operations, test management
4. **receptionist** - Patient management, billing
5. **employee** - Limited administrative access
6. **patient** - Own data access only
=======
2. **chemist** - Laboratory operations, test management
3. **receptionist** - Patient management, billing
4. **employee** - Limited administrative access
5. **patient** - Own data access only
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e

## Database Configuration

### Environments

- **Development**: Local MySQL with root access
- **Test**: Separate test database
- **Production**: Environment variable `DATABASE_URL`

### Connection Settings

```json
{
  "development": {
    "username": "root",
    "password": null,
    "database": "labmanager",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "mysql",
    "dialectOptions": {
      "ssl": {
        "rejectUnauthorized": false
      }
    }
  }
}
```

## CORS Configuration

### Allowed Origins

- Production domains: `labdoctors-laboratories.com`
- Development: `localhost:5173`, `localhost:3000`
- Docker container support

### CORS Headers

- Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
- Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-API-Key
- Credentials: true
- Max Age: 86400 seconds

### CORS Debugging

- `/cors-test` endpoint for CORS troubleshooting
- Detailed logging of CORS requests
- Flexible origin handling for development

## Development Scripts

### Database Operations

```bash
npm run migrate           # Run migrations
npm run migrate:undo      # Undo last migration
npm run run-migrations    # Run custom migrations
npm run db:sync           # Sync database
npm run db:sync:force     # Force sync (drops tables)
npm run db:check          # Check database status
npm run db:fix-culture    # Fix culture data
npm run db:fix-primary-key # Fix primary key issues
```

### Server Operations

```bash
npm start                 # Start with nodemon
npm test                  # Run tests (placeholder)
```

## Database Migrations

### Key Migrations

1. **Timestamp Management**: Added created_at/updated_at to all tables
2. **Test Group Schema**: Implemented test group functionality
3. **Medical Report Structure**: Enhanced report relationships
4. **Pricing System**: Added price fields to bills and contracts
5. **Antibiotic Sensitivity**: Complete antibiotic testing system
6. **Soft Delete**: Added deleted_at for safe record removal

### Migration Strategy

- Sequential migration files with timestamps
- SQL and JavaScript migration support
- Safe migration scripts with rollback capability
- Data integrity checks

## File Upload System

### Multer Configuration

- **Destination**: `uploads/` directory
- **File Filtering**: Image and document types
- **Size Limits**: Configurable file size restrictions
- **Naming**: Unique filename generation

### Supported File Types

- Images: PNG, JPG, JPEG, GIF
- Documents: PDF, DOC, DOCX
- Spreadsheets: XLS, XLSX, CSV

## Error Handling

### Global Error Handler

- Centralized error processing
- Consistent error response format
- Logging for debugging
- User-friendly error messages

### Database Error Handling

- Connection failure recovery
- Transaction rollback on errors
- Data validation errors
- Constraint violation handling

## Security Features

### Password Security

- bcryptjs hashing with salt rounds
- Secure password validation
- Password strength requirements

### Token Security

- JWT with expiration
- Secure token storage
- Automatic token refresh
- Token blacklisting capability

### Input Validation

- Request body validation
- SQL injection prevention
- XSS protection
- File upload security

## Performance Optimization

### Database Optimization

- Indexed foreign keys
- Optimized queries
- Connection pooling
- Query caching

### API Optimization

- Response compression
- Request rate limiting
- Caching headers
- Efficient data serialization

## Monitoring & Logging

### Health Monitoring

- Database connection status
- API endpoint availability
- System resource usage
- Error rate tracking

### Logging

- Request/response logging
- Error logging with stack traces
- Authentication attempts
- Database operation logging

## Deployment

### Environment Variables

- `DATABASE_URL` - Production database connection
- `SECRET_KEY` - JWT secret key
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)

### Docker Deployment

- Containerized application deployment
- Environment variable support
- Health check integration
- Production-ready configuration

### Production Considerations

- Database connection pooling
- Error monitoring and alerting
- Backup strategies
- Performance monitoring
- Security hardening
- CORS configuration for production domains

## Recent Updates

### API URL Standardization

- Frontend now uses `VITE_API_URL` environment variable
- Improved production deployment configuration
- Enhanced CORS handling for multiple domains
- Better environment variable management

### CORS Enhancements

- Added support for Docker container deployments
- Improved CORS debugging with `/cors-test` endpoint
- Enhanced logging for CORS-related issues
- Flexible origin handling for development environments

### Security Improvements

- Enhanced JWT token validation
- Improved error handling for authentication
- Better input validation and sanitization
- Enhanced file upload security

### Performance Optimizations

- Database query optimization
- Response compression improvements
- Better connection pooling
- Enhanced caching strategies

## Troubleshooting

### Common Issues

1. **Database Connection**: Check DATABASE_URL and credentials
2. **CORS Errors**:
   - Verify allowed origins configuration
   - Use `/cors-test` endpoint for debugging
   - Check frontend API URL configuration
3. **Authentication Failures**: Check SECRET_KEY and token format
4. **Migration Issues**: Run migrations sequentially

### Debug Tools

- Database connection testing scripts
- Token validation utilities
- CORS testing endpoints (`/cors-test`)
- Health check endpoints (`/health`)

### Log Analysis

- Check server logs for errors
- Monitor database connection status
- Review authentication attempts
- Analyze API response times
- CORS request logging

### Environment Variable Issues

- Verify all required environment variables are set
- Check environment variable naming conventions
- Test with hardcoded values for debugging
- Ensure proper environment variable loading
