# Development Setup Guide

**Last Updated:** January 20, 2025  
**Version:** 1.0.0

## Prerequisites

Before setting up the development environment, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git** 2.30.0 or higher
- **Supabase CLI** 1.0.0 or higher
- **VS Code** (recommended) with TypeScript extension

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/reporting-workspace.git
cd reporting-workspace
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Facebook Ads API
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google Ads API
VITE_GOOGLE_ADS_CLIENT_ID=your_google_ads_client_id
VITE_GOOGLE_ADS_CLIENT_SECRET=your_google_ads_client_secret

# GoHighLevel API
VITE_GHL_CLIENT_ID=your_ghl_client_id
VITE_GHL_CLIENT_SECRET=your_ghl_client_secret

# Google Sheets API
VITE_GOOGLE_SHEETS_CLIENT_ID=your_google_sheets_client_id
VITE_GOOGLE_SHEETS_CLIENT_SECRET=your_google_sheets_client_secret
```

### 4. Supabase Setup

#### Install Supabase CLI
```bash
npm install -g supabase
```

#### Login to Supabase
```bash
supabase login
```

#### Link to your project
```bash
supabase link --project-ref your-project-ref
```

#### Start local development
```bash
supabase start
```

### 5. Database Setup

Run the database migrations:
```bash
supabase db reset
```

## Development Commands

### Start Development Server
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Supabase Studio: `http://localhost:54323`

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
npm run test
```

### Lint Code
```bash
npm run lint
```

### Type Check
```bash
npm run type-check
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── dashboard/      # Dashboard-specific components
│   └── agency/         # Agency management components
├── services/           # API services and integrations
│   ├── api/           # External API services
│   ├── ghl/           # GoHighLevel specific services
│   └── auth/          # Authentication services
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── contexts/           # React contexts
├── lib/                # Utility libraries
└── types/              # TypeScript type definitions

supabase/
├── functions/          # Edge Functions
├── migrations/         # Database migrations
└── seed.sql           # Seed data
```

## Development Workflow

### 1. Feature Development
1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the coding standards
3. Write tests for new functionality
4. Run linting and type checking
5. Commit your changes with descriptive messages

### 2. Code Standards
- Use TypeScript strict mode
- Follow existing naming conventions
- Write tests for all new features
- Use proper error handling
- Document complex business logic

### 3. Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 4. Deployment
```bash
# Deploy to Vercel
vercel --prod

# Deploy Supabase functions
supabase functions deploy
```

## Debugging

### Frontend Debugging
- Use React DevTools browser extension
- Check browser console for errors
- Use the debug panel (Ctrl+Shift+D)

### Backend Debugging
- Check Supabase logs: `supabase logs`
- Use Supabase Studio for database queries
- Check Edge Function logs in Supabase dashboard

### API Debugging
- Use the built-in API testing page: `/api-testing`
- Check network tab in browser dev tools
- Monitor rate limits and error responses

## Common Issues

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
```

### Supabase Connection Issues
```bash
# Restart Supabase
supabase stop
supabase start
```

### Environment Variables Not Loading
- Ensure `.env.local` is in the root directory
- Restart the development server
- Check for typos in variable names

### TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

## Contributing

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

### Code Review Checklist
- [ ] Code follows TypeScript strict mode
- [ ] Tests are written and passing
- [ ] Linting passes without errors
- [ ] Documentation is updated
- [ ] No console.log statements in production code

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)

## Support

For development questions or issues:
- **Email:** steve@tulenagency.com
- **Documentation:** See service-specific docs
- **Issues:** Create GitHub issues for bugs/features
