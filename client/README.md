# LabManager Client Documentation

## Overview
The LabManager client is a React-based frontend application that provides a comprehensive laboratory management system interface. It supports multiple user roles including patients, admins, doctors, chemists, receptionists, and employees.

## Technology Stack

### Core Technologies
- **React 18.3.1** - Main UI framework
- **Vite 6.0.5** - Build tool and development server
- **React Router DOM 7.1.3** - Client-side routing
- **Axios 1.7.9** - HTTP client for API communication

### UI Libraries
- **Bootstrap 5.3.3** - CSS framework
- **React Bootstrap 2.10.8** - Bootstrap components for React
- **React Bootstrap Icons 1.11.5** - Icon library
- **Framer Motion 12.4.10** - Animation library
- **Lucide React 0.475.0** - Modern icon library

### Form Handling & Validation
- **Formik 2.4.6** - Form state management
- **Yup 1.6.1** - Schema validation
- **React Select 5.10.1** - Enhanced select components
- **React Datepicker 8.2.1** - Date input component

### PDF & Document Generation
- **React PDF Renderer 4.3.0** - PDF generation with WebAssembly support
- **jsPDF 3.0.1** - PDF creation
- **jsPDF AutoTable 5.0.2** - Table generation in PDFs
- **HTML2Canvas 1.4.1** - HTML to canvas conversion

### Data Visualization & Export
- **Recharts 3.0.2** - Chart library
- **XLSX 0.18.5** - Excel file handling

### QR Code & Barcode
- **QRCode React 4.2.0** - QR code generation
- **QRCode SVG 1.1.0** - SVG QR codes
- **jsBarcode 3.11.6** - Barcode generation

### Utilities
- **Luxon 3.6.1** - Date/time manipulation
- **React Toastify 11.0.5** - Toast notifications
- **Prop Types 15.8.1** - Runtime type checking

### Styling
- **Sass 1.83.4** - CSS preprocessor
- **Custom SCSS** - Application-specific styles

## Project Structure

```
client/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, logos, icons
│   │   ├── footerpdf.png
│   │   ├── headerpdf.png
│   │   ├── heroImage.png
│   │   ├── LabIcon.png
│   │   ├── newLabLogo.png
│   │   ├── NewLabLogoNoBack.png
│   │   └── fonts/         # Custom fonts (Cairo)
│   ├── components/        # Reusable UI components
│   │   ├── DynamicTable.jsx
│   │   ├── ErrorPage.jsx
│   │   ├── InvoicePDF.jsx
│   │   ├── MainNavBar.jsx
│   │   ├── MainNavBar.module.css
│   │   ├── PrintPDF.jsx
│   │   ├── SecondaryNavBar.jsx
│   │   ├── TablePagination.jsx
│   │   ├── Toolbar.css
│   │   └── Toolbar.jsx
│   ├── context/          # React Context providers
│   │   └── AuthContext.jsx
│   ├── helpers/          # Utility components
│   │   └── PrivateRoute.jsx
│   ├── pages/            # Page components
│   │   ├── AdminDashboard.jsx
│   │   ├── AdminPage.jsx
│   │   ├── Antibiotics.jsx
│   │   ├── Branches.jsx
│   │   ├── Categories.jsx
│   │   ├── ChemistDashboard.jsx
│   │   ├── CultureOptions.jsx
│   │   ├── Cultures.jsx
│   │   ├── Diseases.jsx
│   │   ├── DoctorDashboard.jsx
│   │   ├── EmployeeDashboard.jsx
│   │   ├── EmployeeManagement.jsx
│   │   ├── HomePage.jsx
│   │   ├── Invoices.jsx
│   │   ├── KnowUs.jsx
│   │   ├── MedicalReports.jsx
│   │   ├── PackagesAndOffers.jsx
│   │   ├── PatientDashboard.jsx
│   │   ├── PatientPage.jsx
│   │   ├── PatientProfile.jsx
│   │   ├── PatientReports.jsx
│   │   ├── PatientsAdminView.jsx
│   │   ├── PatientsAnalytics.jsx
│   │   ├── PatientUpdateProfile.jsx
│   │   ├── PaymentMethods.jsx
│   │   ├── ReceptionistDashboard.jsx
│   │   ├── SampleType.jsx
│   │   ├── TestGroupCategories.jsx
│   │   ├── TestGroupComponents.jsx
│   │   ├── TestGroupEditor.jsx
│   │   ├── TestGroups.jsx
│   │   ├── Tests.jsx
│   │   └── UnifiedLogin.jsx
│   ├── styles/           # Global styles
│   │   └── select.css
│   ├── utils/            # Utility functions
│   │   └── dateFormatter.js
│   ├── App.css           # Main app styles
│   ├── App.jsx           # Main app component
│   ├── custom.scss       # Custom SCSS styles
│   ├── index.css         # Global CSS
│   └── main.jsx          # App entry point
├── dist/                 # Production build output
├── index.html            # HTML template with CSP configuration
├── nginx.conf            # Nginx configuration for Docker
├── Dockerfile            # Docker configuration
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── .env.production       # Production environment variables
└── vercel.json           # Vercel deployment config
```

## Authentication & Authorization

### AuthContext
The application uses React Context for global authentication state management:

- **User State**: Stores current user information and role
- **Token Management**: Handles JWT token storage and validation
- **Auto-logout**: Automatically logs out users on token expiration
- **Persistent Login**: Maintains user session across browser refreshes

### PrivateRoute Component
Implements role-based access control:
- Wraps protected routes
- Validates user authentication
- Checks user role permissions
- Redirects unauthorized users

### User Roles
1. **patient** - Can view reports, update profile
2. **admin** - Full system access
3. **doctor** - Medical report access
4. **chemist** - Laboratory operations
5. **receptionist** - Patient management
6. **employee** - Limited administrative access

## Key Features

### Dashboard System
- Role-specific dashboards for different user types
- Real-time data visualization with charts
- Quick access to common functions

### Medical Reports
- PDF generation for medical reports with React-PDF
- QR code integration for report identification
- Barcode generation for sample tracking
- Print-friendly layouts
- WebAssembly-optimized PDF generation
- Professional medical report templates

### Patient Management
- Patient registration and profile management
- Medical history tracking
- Report viewing and download
- Appointment scheduling

### Laboratory Operations
- Test and culture management
- Sample type configuration
- Antibiotic sensitivity testing
- Test group organization

### Administrative Functions
- Employee management
- Branch management
- Package and offer configuration
- Payment method setup
- Analytics and reporting

## API Integration

### Axios Configuration
- Global interceptors for token management
- Automatic error handling
- CORS support
- Request/response logging

### Environment Variables
- `VITE_API_URL` - Backend API URL (production)
- `VITE_SERVER` - Backend API URL (development, deprecated)
- Default: `http://localhost:3001` (development)

### API URL Configuration
The application now uses a standardized environment variable approach:
- **Development**: Uses localhost for backend
- **Production**: Uses `VITE_API_URL` environment variable
- **Docker**: Configured via environment variables in container

## Development

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Development Server
- Runs on `http://localhost:5173` by default
- Hot module replacement enabled
- Source maps for debugging

### Build Process
- Vite-based build system
- Optimized bundle generation
- Asset optimization
- Environment-specific builds

## Deployment

### Docker Deployment
The application is configured for Docker deployment with Nginx:

```bash
# Build the frontend
pnpm run build

# Build Docker image
docker build -t labmanager-client .

# Run container
docker run -p 80:80 labmanager-client
```

### Nginx Configuration
- Optimized for React SPA
- Gzip compression enabled
- Static asset caching
- Content Security Policy with WebAssembly support
- CORS headers configured

### Content Security Policy
The application includes CSP configuration for:
- WebAssembly support for PDF generation
- External font loading
- API communication
- Secure resource loading

### Production Considerations
- Environment variables must be set in deployment platform
- API URL should point to production backend
- CORS configuration must match backend settings
- SSL certificates for HTTPS

## PDF Generation

### React-PDF Implementation
- Professional medical report templates
- Arabic text support with Cairo font
- QR code and barcode integration
- Antibiotic sensitivity tables
- Test group results display
- Print-optimized layouts

### WebAssembly Support
- Enhanced PDF generation performance
- Browser compatibility considerations
- CSP configuration for WASM execution
- Fallback mechanisms for unsupported browsers

### Error Handling
- Graceful degradation for PDF generation failures
- User-friendly error messages
- Retry mechanisms for failed generations
- Console logging for debugging

## Important Notes

### Asset Management
- Logo and branding assets are stored in `src/assets/`
- PDF templates use specific header/footer images
- Responsive design considerations for all assets
- Font files included for Arabic text support

### State Management
- Uses React Context for global state
- Local state for component-specific data
- No external state management library required

### Error Handling
- Global error boundary implementation
- Toast notifications for user feedback
- Graceful degradation for API failures
- Comprehensive error logging

### Performance
- Code splitting by routes
- Lazy loading for heavy components
- Optimized bundle size
- Image optimization
- WebAssembly optimization for PDF generation

## Recent Updates

### API URL Standardization
- Migrated from `VITE_SERVER` to `VITE_API_URL`
- Removed hardcoded localhost references
- Improved production deployment configuration
- Enhanced environment variable management

### PDF Generation Improvements
- Fixed empty string rendering issues in React-PDF
- Enhanced component stability
- Improved error handling for PDF generation
- Added WebAssembly support for better performance

### Security Enhancements
- Updated Content Security Policy for WebAssembly
- Enhanced CORS configuration
- Improved authentication flow
- Better error handling for security-related issues

### Docker Support
- Added Dockerfile for containerized deployment
- Nginx configuration for production serving
- Environment variable support in containers
- Optimized build process for Docker

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check backend CORS configuration
2. **Authentication Failures**: Verify token format and expiration
3. **Build Failures**: Check for missing dependencies
4. **PDF Generation Issues**: 
   - Ensure Content Security Policy allows WebAssembly
   - Check browser console for CSP violations
   - Verify all assets are available
   - Check for empty string values in data

### Debug Mode
- Enable browser developer tools
- Check network tab for API calls
- Review console for error messages
- Verify localStorage for token storage
- Check CSP violations in console

### PDF Generation Debugging
- Check browser WebAssembly support
- Verify CSP headers in network tab
- Review React-PDF error messages
- Test with simplified PDF templates
- Check for missing font files

### Environment Variable Issues
- Verify `.env.production` file exists
- Check environment variable naming
- Ensure build process includes environment files
- Test with hardcoded values for debugging
