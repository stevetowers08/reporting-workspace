# App Overview

## What is this project?

This is a **Marketing Analytics Dashboard** - a web application that helps businesses track and analyze their advertising performance across multiple platforms like Facebook Ads and Google Ads. Think of it as a centralized command center where you can see all your marketing data in one place.

## Project Goals

### Primary Objectives
- **Unified Dashboard**: Combine data from multiple advertising platforms (Facebook Ads, Google Ads) into a single, easy-to-read interface
- **Real-time Analytics**: Show current performance metrics, campaign results, and ROI calculations
- **Client Management**: Allow businesses to manage multiple clients and their respective advertising accounts
- **Lead Quality Tracking**: Monitor the quality and conversion rates of leads generated from different campaigns
- **Export Capabilities**: Generate PDF reports and export data for further analysis

### Target Users
- **Marketing Agencies**: Managing multiple client accounts
- **Small to Medium Businesses**: Running their own advertising campaigns
- **Marketing Managers**: Needing comprehensive analytics across platforms

## Technology Stack

### Frontend (What Users See)
- **React 19**: Modern JavaScript framework for building interactive user interfaces
- **TypeScript**: Adds type safety to JavaScript, reducing bugs and improving code quality
- **Vite**: Fast build tool that makes development quick and efficient
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Radix UI**: High-quality, accessible component library

### Backend & Data
- **Supabase**: Backend-as-a-Service providing database, authentication, and real-time features
- **PostgreSQL**: Robust relational database for storing all application data
- **React Query**: Manages server state and caching for optimal performance

### External Integrations
- **Facebook Marketing API**: Connects to Facebook Ads accounts
- **Google Ads API**: Connects to Google Ads accounts
- **OAuth 2.0**: Secure authentication with external services

### Development Tools
- **Playwright**: End-to-end testing framework
- **Jest**: Unit testing framework
- **Chart.js**: Data visualization and charting library

## High-Level Architecture

### How It Works
1. **Data Collection**: The app connects to Facebook Ads and Google Ads APIs to fetch campaign data
2. **Data Processing**: Raw advertising data is processed and normalized into consistent formats
3. **Storage**: Processed data is stored in a PostgreSQL database via Supabase
4. **Presentation**: Users interact with a React-based dashboard that displays charts, tables, and metrics
5. **Authentication**: Secure OAuth flows ensure only authorized users can access their data

### Key Components
- **Dashboard Pages**: Main interface showing analytics and metrics
- **Integration Setup**: Configuration pages for connecting external accounts
- **Admin Panel**: Management interface for users and settings
- **Client Management**: Tools for handling multiple client accounts
- **Report Generation**: PDF export functionality for sharing insights

### Data Flow
```
External APIs (Facebook/Google) → OAuth Authentication → Data Fetching → 
Database Storage → React Dashboard → User Interface
```

## Why This Architecture?

### Benefits
- **Scalable**: Can easily add new advertising platforms
- **Secure**: OAuth ensures safe access to external accounts
- **Fast**: React Query caching and Vite's fast builds
- **Maintainable**: TypeScript and modern React patterns
- **Accessible**: Radix UI components ensure usability for all users

### Future Considerations
- **Mobile App**: React Native version for mobile access
- **More Platforms**: Integration with LinkedIn Ads, TikTok Ads, etc.
- **Advanced Analytics**: Machine learning for predictive insights
- **White-label**: Customizable branding for agencies

## Getting Started

For detailed setup instructions, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).

For current project status and progress, see [PROJECT_STATUS.md](./PROJECT_STATUS.md).

For technical architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
