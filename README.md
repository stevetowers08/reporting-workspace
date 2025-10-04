# Marketing Analytics Dashboard

A comprehensive web application for tracking and analyzing advertising performance across multiple platforms including Facebook Ads and Google Ads. Built with React, TypeScript, and modern web technologies.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reporting-workspace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:8080`

## 🚀 Deployment

### Vercel (Recommended)
This project is configured for automatic deployment via Vercel with GitHub integration.

```bash
# Deploy to production
npx vercel --prod

# Deploy to preview
npx vercel
```

**After deployment:**
1. Configure environment variables in Vercel dashboard
2. Update OAuth redirect URIs in Google Cloud Console and Facebook Developer Console
3. Add your Vercel URL to authorized domains

See [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📚 Documentation

### For Non-Coders
This project is designed to be accessible to non-technical users with the help of **Cursor AI**. Here's how to get started:

#### Using Cursor AI
- **Composer (Ctrl + L)**: Ask AI to generate code, create tests, or implement features
- **Inline Chat (Ctrl + I)**: Get help with specific code issues or explanations
- **Code Generation (Ctrl + K)**: Generate code at your cursor position

#### Common AI Prompts
- "Create a React component for displaying campaign metrics"
- "Generate tests for the FacebookAdsService"
- "Fix this TypeScript error"
- "Explain how this function works"

### Complete Documentation

| Document | Description |
|----------|-------------|
| [📖 App Overview](./docs/ai/APP_OVERVIEW.md) | Project goals, tech stack, and high-level architecture |
| [📊 Project Status](./docs/ai/PROJECT_STATUS.md) | Current progress, TODOs, and blockers |
| [🏗️ Architecture](./docs/ai/ARCHITECTURE.md) | File structure, naming conventions, and database schemas |
| [🧪 Testing](./docs/ai/TESTING.md) | Testing setup, Jest, Playwright, and ARIA snapshots |
| [🛠️ Development Guide](./docs/ai/DEVELOPMENT_GUIDE.md) | Setup, workflows, and Cursor AI usage |
| [🎨 Design System](./docs/ai/DESIGN_SYSTEM.md) | UI components, styles, and design tokens |
| [🔌 Integrations Guide](./docs/ai/INTEGRATIONS_GUIDE.md) | External APIs, Facebook Ads, Google Ads, Supabase |
| [🔧 Troubleshooting](./docs/ai/TROUBLESHOOTING_GUIDE.md) | Common issues, fixes, and debugging with AI |

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library

### Backend & Data
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **React Query** - Server state management

### External Integrations
- **Facebook Marketing API** - Facebook Ads data
- **Google Ads API** - Google Ads data
- **OAuth 2.0** - Secure authentication

### Development Tools
- **Playwright** - End-to-end testing
- **Jest** - Unit testing
- **Chart.js** - Data visualization
- **MSW** - API mocking

## 🚀 Features

### Current Features
- ✅ Multi-platform dashboard (Facebook Ads, Google Ads)
- ✅ Real-time campaign metrics
- ✅ Client management system
- ✅ OAuth authentication
- ✅ PDF report generation
- ✅ **Shared Report Layout**: Optimized client-facing reports for laptop screens
- ✅ **Mobile Responsive Design**: Perfect display on all devices
- ✅ **Component Architecture**: Reusable dashboard components
- ✅ **Comprehensive Testing**: Jest and Playwright test suites
- ✅ Responsive design
- ✅ Debug panel for development

### Planned Features
- 🔄 Advanced analytics and ROI calculations
- 🔄 Lead quality scoring
- 🔄 Automated reporting
- 🔄 Additional platform integrations
- 🔄 Mobile app

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test            # Run unit tests
npm run test:e2e    # Run end-to-end tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Linting
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
```

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components (routes)
├── services/      # Business logic and API calls
├── lib/          # Utility libraries
├── types/        # TypeScript type definitions
└── App.tsx       # Main application component
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# Facebook Ads
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
REACT_APP_FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google Ads
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret
REACT_APP_GOOGLE_DEVELOPER_TOKEN=your_google_developer_token
```

### Database Setup

1. Create a Supabase project
2. Run the database schema from `database-schema.sql`
3. Set up Row Level Security policies
4. Configure OAuth providers

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Test Coverage

The project maintains high test coverage with:
- Unit tests for components and services
- Integration tests for API calls
- End-to-end tests for user workflows
- Accessibility tests with ARIA snapshots
- Performance tests with Lighthouse audits

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Deployment Options

- **Vercel**: Recommended for React applications
- **Netlify**: Good for static sites
- **AWS S3 + CloudFront**: For enterprise deployments
- **Docker**: For containerized deployments

## 🤝 Contributing

### For Non-Coders

1. **Use Cursor AI**: Open Composer (`Ctrl + L`) and ask for help
2. **Update Documentation**: Edit files in `docs/ai/` directory
3. **Test Changes**: Use AI to generate and run tests
4. **Report Issues**: Use the troubleshooting guide for common problems

### For Developers

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

### Getting Help

1. **Check Documentation**: Start with the relevant guide in `docs/ai/`
2. **Use Cursor AI**: Ask AI for help with specific issues
3. **Check Troubleshooting**: See `TROUBLESHOOTING_GUIDE.md` for common issues
4. **Report Issues**: Create GitHub issues for bugs or feature requests

### AI-Assisted Development

This project is optimized for AI-assisted development with Cursor:

- **Code Generation**: Use `Ctrl + L` to generate components, tests, and services
- **Debugging**: Use `Ctrl + I` to debug specific issues
- **Learning**: Ask AI to explain concepts and best practices
- **Refactoring**: Use AI to improve code quality and performance

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Cursor AI** for AI-assisted development
- **Supabase** for backend infrastructure
- **Radix UI** for accessible components
- **Tailwind CSS** for styling utilities
- **React Query** for server state management

---

**Happy coding with AI! 🚀**

For detailed information, see the complete documentation in the `docs/ai/` directory.
