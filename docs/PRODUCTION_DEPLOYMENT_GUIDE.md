# Production Deployment Guide

## Overview
This guide covers deploying the Marketing Analytics Dashboard to production with proper environment configuration, security, and monitoring.

## Prerequisites
- Node.js 18+ and npm
- Supabase project with production database
- Domain name and SSL certificate
- Production API credentials for all integrations

## Environment Setup

### 1. Copy Environment Files
```bash
# Copy the appropriate environment file
cp config/env.production.example .env.production

# Edit with your production values
nano .env.production
```

### 2. Required Environment Variables

#### Supabase Configuration
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### API Integrations
```env
# Facebook Ads API
VITE_FACEBOOK_APP_ID=your-facebook-app-id
VITE_FACEBOOK_APP_SECRET=your-facebook-app-secret
VITE_FACEBOOK_REDIRECT_URI=https://yourdomain.com/auth/facebook/callback

# Google Ads API
VITE_GOOGLE_ADS_CLIENT_ID=your-google-client-id
VITE_GOOGLE_ADS_CLIENT_SECRET=your-google-client-secret
VITE_GOOGLE_ADS_REDIRECT_URI=https://yourdomain.com/auth/google/callback
VITE_GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token

# Go High Level API
VITE_GHL_API_KEY=your-ghl-api-key
VITE_GHL_LOCATION_ID=your-ghl-location-id

# Google Sheets API
VITE_GOOGLE_SHEETS_CLIENT_ID=your-sheets-client-id
VITE_GOOGLE_SHEETS_CLIENT_SECRET=your-sheets-client-secret
VITE_GOOGLE_SHEETS_REDIRECT_URI=https://yourdomain.com/auth/sheets/callback
```

#### Application Configuration
```env
VITE_APP_NAME=Marketing Analytics Dashboard
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
VITE_APP_URL=https://yourdomain.com
```

#### Security (Generate Strong Keys!)
```env
VITE_JWT_SECRET=your-strong-jwt-secret-here
VITE_ENCRYPTION_KEY=your-strong-encryption-key-here
```

## Build Process

### 1. Install Dependencies
```bash
npm ci --production
```

### 2. Build Application
```bash
# Build for production
npm run build

# Verify build
npm run preview
```

### 3. Test Build
```bash
# Run type checking
npm run type-check

# Run tests
npm run test:run
```

## Deployment Options

### Option 1: Vercel Deployment (Recommended)
This project is configured for automatic deployment via Vercel with GitHub integration.

#### Automatic Deployment Setup
1. **Connect Repository**: The project is already connected to Vercel via GitHub
2. **Environment Variables**: Configure in Vercel dashboard
3. **Automatic Deployments**: Every push to `main` branch triggers deployment

#### Manual Deployment Commands
```bash
# Deploy to production
npx vercel --prod

# Deploy to preview
npx vercel

# Check deployment status
npx vercel ls
```

#### Vercel Configuration
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

#### Environment Variables in Vercel
Configure these in the Vercel dashboard under Settings → Environment Variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_FACEBOOK_CLIENT_ID=your-facebook-app-id
VITE_FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
VITE_GHL_CLIENT_ID=your-ghl-client-id
```

#### OAuth Configuration for Vercel
After deployment, update OAuth settings:
1. **Google Cloud Console**:
   - Add `https://your-app.vercel.app/oauth/callback` to Authorized redirect URIs
   - Add `https://your-app.vercel.app` to Authorized JavaScript origins
2. **Facebook Developer Console**:
   - Add `https://your-app.vercel.app/oauth/callback` to Valid OAuth Redirect URIs

### Option 2: Other Static Hosting
Deploy the `dist/` folder to:
- **Netlify**: Drag and drop `dist/` folder
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **GitHub Pages**: Push to `gh-pages` branch

### Option 2: Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Option 3: Server Deployment
```bash
# Install PM2 for process management
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'marketing-dashboard',
    script: 'npm',
    args: 'run preview',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Security Checklist

### 1. Environment Variables
- [ ] All sensitive data in environment variables
- [ ] No hardcoded secrets in code
- [ ] Different keys for each environment
- [ ] Regular key rotation

### 2. API Security
- [ ] HTTPS enabled for all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation enabled

### 3. Database Security
- [ ] Row Level Security (RLS) enabled
- [ ] Database backups configured
- [ ] Access logs monitored
- [ ] Regular security updates

## Monitoring & Analytics

### 1. Error Tracking
```env
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ENABLE_ERROR_REPORTING=true
```

### 2. Performance Monitoring
```env
VITE_GOOGLE_ANALYTICS_ID=your-ga-id
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### 3. Logging
```env
VITE_LOG_LEVEL=error
VITE_LOG_ENABLE_REMOTE=true
```

## Performance Optimization

### 1. Build Optimization
- [ ] Code splitting enabled
- [ ] Tree shaking configured
- [ ] Minification enabled
- [ ] Gzip compression enabled

### 2. Caching Strategy
```env
VITE_CACHE_TTL=300000
VITE_CACHE_MAX_SIZE=100
```

### 3. CDN Configuration
- [ ] Static assets served from CDN
- [ ] Proper cache headers set
- [ ] Image optimization enabled

## Health Checks

### 1. Application Health
```bash
# Check if application is running
curl -f http://localhost:3000/health || exit 1
```

### 2. Database Health
```bash
# Check database connection
npm run db:health-check
```

### 3. API Health
```bash
# Check all API endpoints
npm run api:health-check
```

## Backup Strategy

### 1. Database Backups
- [ ] Automated daily backups
- [ ] Point-in-time recovery enabled
- [ ] Backup testing scheduled

### 2. Code Backups
- [ ] Git repository backed up
- [ ] Deployment artifacts stored
- [ ] Configuration files versioned

## Rollback Plan

### 1. Quick Rollback
```bash
# Revert to previous deployment
pm2 restart marketing-dashboard
# or
vercel rollback
```

### 2. Database Rollback
```bash
# Restore from backup
supabase db restore --backup-id <backup-id>
```

## Maintenance

### 1. Regular Updates
- [ ] Dependencies updated monthly
- [ ] Security patches applied immediately
- [ ] Performance monitoring reviewed weekly

### 2. Monitoring Alerts
- [ ] Error rate alerts configured
- [ ] Performance degradation alerts
- [ ] Resource usage monitoring

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Environment Issues
```bash
# Verify environment variables
npm run env:check
```

#### Database Connection Issues
```bash
# Test database connection
npm run db:test
```

## Support

For production issues:
1. Check application logs
2. Review error tracking dashboard
3. Check database health
4. Verify API integrations
5. Contact support team

## Security Incident Response

1. **Immediate Response**
   - Isolate affected systems
   - Preserve evidence
   - Notify stakeholders

2. **Investigation**
   - Analyze logs and metrics
   - Identify root cause
   - Assess impact

3. **Recovery**
   - Apply fixes
   - Restore services
   - Monitor for recurrence

4. **Post-Incident**
   - Document lessons learned
   - Update security measures
   - Conduct team review
