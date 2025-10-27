# LabManager - Complete Laboratory Management System

## Overview
LabManager is a comprehensive laboratory management system designed to streamline medical laboratory operations. It provides a complete solution for managing patients, medical tests, cultures, billing, and administrative tasks in a multi-branch laboratory environment.

## System Architecture

### Technology Stack
- **Frontend**: React 18 + Vite + Bootstrap 5
- **Backend**: Node.js + Express.js + Sequelize ORM
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Docker + Nginx (Frontend) + Railway (Backend)

### Project Structure
```
LabManager/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React Context providers
│   │   ├── helpers/      # Utility components
│   │   ├── assets/       # Images and static files
│   │   └── utils/        # Utility functions
│   ├── public/           # Static assets
│   ├── dist/             # Production build output
│   ├── nginx.conf        # Nginx configuration
│   ├── Dockerfile        # Frontend Docker configuration
│   └── package.json      # Frontend dependencies
├── server/               # Node.js backend application
│   ├── models/          # Sequelize database models
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   ├── migrations/      # Database migrations
│   ├── scripts/         # Utility scripts
│   ├── config/          # Configuration files
│   └── package.json     # Backend dependencies
├── docker-compose.yml   # Docker orchestration
└── README.md           # This documentation
```

## Key Features

### Multi-Role User System
- **Patients**: View medical reports, update profiles, track appointments
- **Admins**: Full system access and configuration
- **Doctors**: Medical report access and patient data management
- **Chemists**: Laboratory operations and test management
- **Receptionists**: Patient registration and billing
- **Employees**: Limited administrative access

### Laboratory Operations
- **Test Management**: Create, configure, and manage medical tests
- **Culture Management**: Bacterial culture testing and results
- **Antibiotic Sensitivity**: Complete antibiotic testing system
- **Sample Types**: Configurable sample type management
- **Test Groups**: Grouped test configurations for efficiency

### Medical Reports
- **PDF Generation**: Professional medical report generation with React-PDF
- **QR Code Integration**: Report identification and tracking
- **Barcode Support**: Sample tracking and identification
- **Digital Signatures**: Secure report authentication
- **Print Optimization**: Print-friendly report layouts
- **WebAssembly Support**: Optimized PDF generation performance

### Patient Management
- **Registration**: Complete patient registration system
- **Profile Management**: Patient information and history
- **Medical History**: Disease tracking and medical records
- **Appointment Scheduling**: Appointment management system
- **Report Access**: Secure report viewing and download

### Billing & Financial
- **Invoice Generation**: Automated invoice creation
- **Payment Methods**: Multiple payment option support
- **Package Management**: Service package configuration
- **Contract Management**: Corporate contract handling
- **Financial Reporting**: Revenue and billing analytics

### Administrative Functions
- **Branch Management**: Multi-branch laboratory support
- **Employee Management**: Staff and role management
- **Category Management**: Test and culture categorization
- **Analytics Dashboard**: Business intelligence and reporting
- **System Configuration**: Application settings and preferences

## Database Design

### Core Entity Relationships

#### User Management
```
admin, chemist, doctor, employee, patient, receptionist
├── phone (contact information)
├── branch_has_employee (branch assignments)
└── patient_has_diseases (medical history)
```

#### Laboratory Operations
```
test, culture, antibiotic, sample_type
├── test_component (test components)
├── test_group (grouped tests)
├── tg_component (test group components)
├── tg_fields (test group fields)
├── culture_option (culture options)
└── test_has_question (test questions)
```

#### Medical Reports
```
medical_report
├── medical_report_has_test (test results)
├── medical_report_has_culture (culture results)
├── medical_report_has_culture_antibiotic (antibiotic sensitivity)
├── medical_report_has_tg (test group results)
└── medical_report_tg_field_value (field values)
```

#### Billing System
```
bill
├── bill_has_test (tests in bill)
├── bill_has_culture (cultures in bill)
├── bill_has_tg (test groups in bill)
├── bill_has_package (packages in bill)
└── bill_has_payment_method (payment methods)
```

#### Administrative
```
branch, company, contract, packages_and_offers
├── contract_has_test (contract tests)
├── contract_has_culture (contract cultures)
├── pao_has_test (package tests)
├── pao_has_culture (package cultures)
└── categories_test_and_culture (categorization)
```

## API Architecture

### RESTful Endpoints
- **Authentication**: `/login`, `/me`, `/logout`
- **Health Checks**: `/`, `/health`, `/cors-test`
- **User Management**: `/admin`, `/patient`, `/employee`, `/receptionist`
- **Medical Reports**: `/medical-reports`
- **Laboratory**: `/tests`, `/cultures`, `/antibiotics`, `/test-groups`
- **Billing**: `/invoices`, `/bills`
- **Administrative**: `/branches`, `/categories`, `/packages-and-offers`

### Authentication Flow
1. User submits credentials
2. Server validates and returns JWT token
3. Client stores token in localStorage
4. Token included in Authorization header for subsequent requests
5. Server validates token on protected routes
6. Role-based access control applied

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **CORS Protection**: Configured for production domains
- **Input Validation**: Request body and parameter validation
- **SQL Injection Prevention**: Sequelize ORM protection
- **File Upload Security**: Multer with file type validation

## Frontend Architecture

### Component Structure
- **Layout Components**: MainNavBar, SecondaryNavBar, ErrorPage
- **Form Components**: Dynamic forms with Formik and Yup validation
- **Data Display**: DynamicTable, TablePagination, Toolbar
- **PDF Components**: InvoicePDF, PrintPDF for document generation
- **Page Components**: Role-specific dashboard and management pages

### State Management
- **React Context**: Global authentication state
- **Local State**: Component-specific data
- **Form State**: Formik for form management
- **API State**: Axios for server communication

### Routing System
- **Public Routes**: Home, login, error pages
- **Protected Routes**: Role-based access control
- **Dashboard Routes**: Role-specific dashboards
- **Management Routes**: Administrative functions

## Backend Architecture

### Middleware Stack
1. **CORS**: Cross-origin resource sharing
2. **Body Parser**: JSON request parsing
3. **Authentication**: JWT token validation
4. **Authorization**: Role-based access control
5. **Error Handling**: Global error processing

### Database Operations
- **Sequelize ORM**: Object-relational mapping
- **Migrations**: Database schema versioning
- **Associations**: Entity relationships
- **Transactions**: Data integrity
- **Validation**: Model-level validation

### File Handling
- **Multer**: File upload middleware
- **Image Processing**: Profile picture handling
- **Document Storage**: Report and document management
- **Excel Processing**: Data import/export functionality

## Development Workflow

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- pnpm (recommended package manager)
- Docker (for production deployment)

### Setup Instructions

#### 1. Clone Repository
```bash
git clone <repository-url>
cd LabManager
```

#### 2. Backend Setup
```bash
cd server
pnpm install
cp .env.example .env
# Configure environment variables
pnpm run db:sync
pnpm start
```

#### 3. Frontend Setup
```bash
cd client
pnpm install
# Create .env.production for production API URL
echo "VITE_API_URL=https://api.labdoctors-laboratories.com" > .env.production
pnpm run dev
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=mysql://username:password@host:port/database
SECRET_KEY=your-jwt-secret-key
NODE_ENV=development
PORT=3001
```

#### Frontend (.env.production)
```env
VITE_API_URL=https://api.labdoctors-laboratories.com
```

### Development Scripts

#### Backend
```bash
npm start              # Start development server
npm run migrate        # Run database migrations
npm run db:sync        # Sync database schema
npm run db:check       # Check database status
```

#### Frontend
```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run lint           # Run ESLint
npm run preview        # Preview production build
```

## Deployment

### Docker Deployment
- **Frontend**: Nginx container serving React build
- **Backend**: Node.js container with Express server
- **Database**: MySQL container or external database
- **Orchestration**: Docker Compose for local deployment

### Production Deployment
- **Frontend**: Docker container with Nginx
- **Backend**: Railway or similar cloud platform
- **Database**: Production MySQL instance
- **Domain**: Custom domain with SSL certificates

### Production Considerations
- **Database**: Production MySQL instance with SSL
- **Security**: Strong JWT secret keys
- **CORS**: Configured for production domains
- **Monitoring**: Health checks and error tracking
- **Backup**: Regular database backups
- **SSL**: HTTPS enforcement
- **Content Security Policy**: WebAssembly support for PDF generation

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Token expiration and refresh
- Secure password hashing
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- File upload security
- CORS configuration

### Privacy & Compliance
- Patient data encryption
- Audit logging
- Access control
- Data retention policies
- HIPAA compliance considerations

## Performance Optimization

### Frontend
- Code splitting by routes
- Lazy loading for heavy components
- Image optimization
- Bundle size optimization
- Caching strategies
- WebAssembly optimization for PDF generation

### Backend
- Database query optimization
- Connection pooling
- Response compression
- Caching headers
- Rate limiting

### Database
- Indexed foreign keys
- Optimized queries
- Query result caching
- Connection management
- Regular maintenance

## Monitoring & Maintenance

### Health Monitoring
- Database connection status
- API endpoint availability
- System resource usage
- Error rate tracking
- Response time monitoring

### Logging
- Request/response logging
- Error logging with stack traces
- Authentication attempts
- Database operation logging
- Performance metrics

### Backup Strategy
- Regular database backups
- File system backups
- Configuration backups
- Disaster recovery plan
- Data retention policies

## Troubleshooting

### Common Issues

#### Database Connection
- Verify DATABASE_URL format
- Check database credentials
- Ensure database server is running
- Test connection with database client

#### CORS Errors
- Verify allowed origins in backend
- Check frontend API URL configuration
- Ensure proper CORS headers
- Test with CORS debugging endpoints

#### Authentication Issues
- Check JWT secret key configuration
- Verify token format and expiration
- Review authentication middleware
- Test token validation

#### Build Failures
- Check for missing dependencies
- Verify Node.js version compatibility
- Review build configuration
- Check for syntax errors

#### PDF Generation Issues
- Check Content Security Policy settings
- Verify WebAssembly support
- Ensure all assets are available
- Check browser console for errors

### Debug Tools
- Database connection testing scripts
- Token validation utilities
- CORS testing endpoints
- Health check endpoints
- Log analysis tools

## Recent Updates

### API URL Configuration
- Standardized environment variable usage (`VITE_API_URL`)
- Removed hardcoded localhost references
- Improved production deployment configuration

### PDF Generation Improvements
- Enhanced React-PDF component stability
- Fixed empty string rendering issues
- Added WebAssembly support for better performance
- Improved Content Security Policy configuration

### Docker Deployment
- Added Nginx configuration for frontend
- Improved Docker Compose setup
- Enhanced production deployment workflow

## Future Enhancements

### Planned Features
- **Mobile Application**: React Native mobile app
- **Real-time Notifications**: WebSocket integration
- **Advanced Analytics**: Business intelligence dashboard
- **API Documentation**: Swagger/OpenAPI documentation
- **Multi-language Support**: Internationalization
- **Advanced Reporting**: Custom report builder
- **Integration APIs**: Third-party system integration
- **Audit Trail**: Comprehensive activity logging

### Technical Improvements
- **Microservices Architecture**: Service decomposition
- **Containerization**: Docker deployment (in progress)
- **CI/CD Pipeline**: Automated testing and deployment
- **Performance Monitoring**: APM integration
- **Security Scanning**: Automated security testing
- **Code Quality**: Automated code review tools

## Support & Documentation

### Additional Resources
- **Client Documentation**: See `client/README.md`
- **Server Documentation**: See `server/README.md`
- **API Documentation**: Inline code documentation
- **Database Schema**: Migration files and model definitions

### Contact Information
- **Developer**: Mohab
- **Repository**: https://github.com/mohab-kamle/Lab-Manager-Fullstack.git
- **Issues**: GitHub Issues for bug reports
- **Documentation**: This README and component-specific docs

---

**Note**: This system is designed for medical laboratory use and should be deployed with appropriate security measures and compliance considerations for healthcare data handling. 
