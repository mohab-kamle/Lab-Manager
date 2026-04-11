# Security Notes

## Current Security Status

This document outlines the current security status of the LabManager server application and provides guidance on known vulnerabilities and their mitigation strategies.

## Resolved Vulnerabilities

### ✅ XLSX Package Vulnerabilities (RESOLVED)

**Issue**: The `xlsx` package had multiple security vulnerabilities:
- Prototype Pollution
- Regular Expression Denial of Service (ReDoS)

**Resolution**: 
- Replaced `xlsx` package with `exceljs` in all server-side Excel processing
- Created secure `excelService.js` with proper validation and sanitization
- Updated routes: `diseases.js`, `questions.js`, and `medical_reports.js`
- Removed vulnerable `xlsx` package from dependencies

**Files Modified**:
- `services/excelService.js` (new secure service)
- `routes/diseases.js`
- `routes/questions.js` 
- `routes/medical_reports.js`
- `package.json` (removed xlsx dependency)

## Current Known Vulnerabilities

### ⚠️ PM2 Regular Expression Denial of Service (Low Severity)

**Package**: `pm2@6.0.8`
**Vulnerability**: Regular Expression Denial of Service (ReDoS)
**Severity**: Low
**Status**: No fix available yet

**Details**: <mcreference link="https://security.snyk.io/package/npm/pm2/6.0.0-beta.0" index="2">2</mcreference>
- Vulnerability exists in the `_valid` function in `Config.js`
- Exposed through `validateJSON` function
- A fix has been pushed to master branch but not yet published <mcreference link="https://security.snyk.io/package/npm/pm2/6.0.0-beta.0" index="2">2</mcreference>

**Risk Assessment**:
- **Low Risk**: PM2 is only used for production process management
- **Limited Exposure**: Vulnerability requires specific crafted input to PM2 configuration
- **Mitigation**: PM2 configuration is controlled by administrators, not user input

**Mitigation Strategies**:
1. **Access Control**: Ensure only trusted administrators have access to PM2 configuration
2. **Input Validation**: If programmatically updating PM2 config, validate all inputs
3. **Monitoring**: Monitor for unusual CPU usage patterns that might indicate ReDoS attacks
4. **Alternative Deployment**: Consider using Docker containers or other process managers if needed

**Monitoring for Updates**:
- Check for PM2 updates regularly: `npm outdated pm2`
- Monitor PM2 GitHub repository for security releases
- Subscribe to security advisories for PM2

## Security Best Practices Implemented

### Excel File Processing
- ✅ File size limits (5MB)
- ✅ MIME type validation
- ✅ Buffer validation and sanitization
- ✅ Memory-based processing (no temporary files)
- ✅ Input sanitization to prevent formula injection
- ✅ Error handling and logging

### General Security Measures
- ✅ Authentication middleware
- ✅ Role-based authorization
- ✅ Input validation
- ✅ SQL injection prevention (Sequelize ORM)
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Rate limiting considerations

## Recommendations

### Immediate Actions
1. **Monitor PM2 Updates**: Set up alerts for PM2 security updates
2. **Review PM2 Usage**: Ensure PM2 configuration is only accessible to administrators
3. **Consider Alternatives**: Evaluate if PM2 is essential or if alternatives like Docker can be used

### Long-term Actions
1. **Automated Security Scanning**: Implement automated `npm audit` in CI/CD pipeline
2. **Dependency Updates**: Regular dependency updates and security reviews
3. **Security Testing**: Include ReDoS testing in security assessment procedures

## Security Contacts

For security-related issues:
- Review this document regularly
- Run `npm audit` before deployments
- Monitor security advisories for all dependencies

## Last Updated

**Date**: December 2024
**Status**: 1 low-severity vulnerability remaining (PM2 ReDoS)
**Action Required**: Monitor for PM2 updates