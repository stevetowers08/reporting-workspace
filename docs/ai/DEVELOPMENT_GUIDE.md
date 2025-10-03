# Development Guide

## Project Setup

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Cursor IDE**: For AI-assisted development

### Installation Steps

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

4. **Set up Supabase**
   ```bash
   # Follow instructions in INTEGRATIONS_GUIDE.md
   npm run setup:supabase
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   - Navigate to `http://localhost:8080`
   - The app should load with the dashboard

## Development Workflows

### Daily Development Workflow

1. **Start your day**
   ```bash
   git pull origin main
   npm install  # If package.json changed
   npm run dev
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes**
   - Use Cursor AI for code generation and assistance
   - Follow coding standards in `.cursorrules`
   - Write tests for new features

4. **Test your changes**
   ```bash
   npm test
   npm run test:e2e
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

### Using Cursor AI for Development

#### Composer (Ctrl + L)
The Composer is your main AI assistant for complex tasks:

**Use Composer for:**
- Generating entire components
- Creating test suites
- Refactoring large code blocks
- Implementing complex features

**Example prompts:**
- "Create a React component for displaying campaign metrics with TypeScript"
- "Generate unit tests for the FacebookAdsService"
- "Refactor the EventDashboard to use React Query"

#### Inline Chat (Ctrl + I)
Inline chat helps with specific code issues:

**Use inline chat for:**
- Explaining code
- Fixing bugs
- Optimizing performance
- Adding comments

**Example prompts:**
- "Explain what this function does"
- "Fix the TypeScript error on line 45"
- "Optimize this component for better performance"

#### Code Generation Shortcuts
- **Ctrl + K**: Generate code at cursor position
- **Ctrl + Shift + K**: Generate code above cursor
- **Tab**: Accept AI suggestions
- **Esc**: Reject AI suggestions

### File Organization

#### Creating New Components
1. **Use Composer**: `Ctrl + L` → "Create a new React component called UserProfile"
2. **Follow naming conventions**: PascalCase for components
3. **Add to appropriate directory**: `src/components/` or `src/pages/`
4. **Export properly**: Use default exports for components

#### Creating New Services
1. **Use Composer**: `Ctrl + L` → "Create a service for LinkedIn Ads API"
2. **Follow naming conventions**: camelCase with `Service` suffix
3. **Add to services directory**: `src/services/linkedinAdsService.ts`
4. **Include TypeScript interfaces**: Define proper types

#### Creating New Pages
1. **Use Composer**: `Ctrl + L` → "Create a new page for LinkedIn Ads dashboard"
2. **Add routing**: Update `src/App.tsx` with new route
3. **Follow page structure**: Use existing pages as templates

### Code Quality Standards

#### TypeScript Best Practices
- **Always use strict mode**: Enabled in `tsconfig.json`
- **Define interfaces**: Create types for all data structures
- **Use proper imports**: Prefer named imports over default imports
- **Avoid `any` type**: Use proper typing or `unknown`

#### React Best Practices
- **Use functional components**: Prefer hooks over class components
- **Implement proper error boundaries**: Wrap components in error boundaries
- **Use React Query**: For all server state management
- **Optimize re-renders**: Use `useMemo` and `useCallback` appropriately

#### CSS and Styling
- **Use Tailwind CSS**: Utility-first approach
- **Follow design system**: Use components from `src/components/ui/`
- **Responsive design**: Mobile-first approach
- **Accessibility**: Include proper ARIA labels

### Testing Workflow

#### Writing Tests
1. **Use Composer**: `Ctrl + L` → "Generate tests for the CampaignMetrics component"
2. **Follow test structure**: Arrange, Act, Assert pattern
3. **Test user interactions**: Use React Testing Library
4. **Mock external dependencies**: Use MSW for API mocking

#### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

#### Debugging Tests
1. **Use inline chat**: `Ctrl + I` on failing test
2. **Prompt AI**: "Fix this test failure" and paste error
3. **Check troubleshooting guide**: See `TROUBLESHOOTING_GUIDE.md`

### Database Development

#### Schema Changes
1. **Create migration**: Use Supabase CLI
2. **Test locally**: Use local Supabase instance
3. **Update types**: Regenerate TypeScript types
4. **Update services**: Modify affected services

#### Data Seeding
```bash
# Seed development data
npm run db:seed

# Reset database
npm run db:reset
```

### API Integration

#### Adding New APIs
1. **Create service file**: `src/services/newApiService.ts`
2. **Implement authentication**: Follow OAuth patterns
3. **Add error handling**: Use try-catch blocks
4. **Write tests**: Mock API responses

#### Testing API Integrations
1. **Use MSW**: Mock API responses in tests
2. **Test error cases**: Network failures, invalid responses
3. **Test authentication**: Token refresh, expiration

### Performance Optimization

#### Frontend Optimization
- **Code splitting**: Use dynamic imports for large components
- **Image optimization**: Use proper image formats and sizes
- **Bundle analysis**: Run `npm run analyze` to check bundle size
- **Caching**: Implement proper caching strategies

#### Backend Optimization
- **Database queries**: Optimize with proper indexes
- **API responses**: Implement pagination and filtering
- **Caching**: Use React Query caching effectively

### Debugging

#### Using Debug Panel
- **Keyboard shortcut**: `Ctrl + Shift + D` to toggle debug panel
- **View logs**: Check console logs and errors
- **Monitor state**: Track component state changes
- **API calls**: Monitor network requests

#### Common Debugging Techniques
1. **Console logging**: Use `debugLogger` for structured logging
2. **React DevTools**: Install browser extension
3. **Network tab**: Monitor API calls and responses
4. **Performance tab**: Identify performance bottlenecks

### Deployment

#### Local Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

#### Environment Setup
1. **Production environment**: Set up production Supabase project
2. **Environment variables**: Configure production secrets
3. **Domain setup**: Configure custom domain
4. **SSL certificates**: Ensure HTTPS is enabled

### Troubleshooting Common Issues

#### Development Server Issues
- **Port conflicts**: Change port in `vite.config.ts`
- **Module resolution**: Check `tsconfig.json` paths
- **Dependency issues**: Clear `node_modules` and reinstall

#### Build Issues
- **TypeScript errors**: Fix type issues before building
- **Import errors**: Check file paths and exports
- **Asset loading**: Verify asset paths in build

#### Testing Issues
- **Test failures**: Check test setup and mocks
- **E2E failures**: Verify test environment setup
- **Coverage issues**: Ensure all code paths are tested

### AI-Assisted Development Tips

#### Effective Prompting
- **Be specific**: Include file names, function names, and context
- **Provide examples**: Show expected input/output
- **Reference documentation**: Point to relevant docs
- **Iterate**: Refine prompts based on results

#### Code Review with AI
- **Use inline chat**: `Ctrl + I` on code sections
- **Ask for improvements**: "How can I make this more efficient?"
- **Check best practices**: "Does this follow React best practices?"

#### Learning New Technologies
- **Ask for explanations**: "Explain how React Query works"
- **Request examples**: "Show me how to use Playwright for E2E testing"
- **Get recommendations**: "What's the best way to handle errors in React?"

### Team Collaboration

#### Code Reviews
1. **Use AI for initial review**: Check for common issues
2. **Follow coding standards**: Ensure consistency
3. **Test thoroughly**: Verify all tests pass
4. **Document changes**: Update relevant documentation

#### Documentation Updates
1. **Update PROJECT_STATUS.md**: Track progress and blockers
2. **Update ARCHITECTURE.md**: Document new components/services
3. **Update INTEGRATIONS_GUIDE.md**: Document new API integrations

#### Knowledge Sharing
- **Use AI to explain code**: Generate documentation
- **Create examples**: Use AI to generate code examples
- **Share learnings**: Document new patterns and solutions

---

For project overview, see [APP_OVERVIEW.md](./APP_OVERVIEW.md).  
For current status, see [PROJECT_STATUS.md](./PROJECT_STATUS.md).  
For troubleshooting, see [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md).
