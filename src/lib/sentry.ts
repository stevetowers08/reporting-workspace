import * as Sentry from "@sentry/react";
import { debugLogger } from './debug';

/**
 * Sentry Configuration for Production Monitoring
 * 
 * This provides:
 * - Error tracking and reporting
 * - Performance monitoring
 * - User session tracking
 * - Release tracking
 */
export const initSentry = () => {
  // Only initialize in production or when explicitly enabled
  const isProduction = import.meta.env.PROD;
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!isProduction || !sentryDsn) {
    debugLogger.info('Sentry', 'Sentry not initialized - not in production or missing DSN');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: isProduction ? 0.1 : 1.0, // Lower sample rate in production
      
      // ✅ DISABLE Session Replay to fix SES lockdown conflicts with React
      replaysSessionSampleRate: 0, // Disable session replay
      replaysOnErrorSampleRate: 0, // Disable error replay
      
      // Performance monitoring - Session Replay disabled to prevent SES conflicts
      integrations: [
        // Session Replay integration removed to prevent SES lockdown conflicts
        // Can be re-enabled later with proper configuration
      ],
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out development errors
        if (event.exception) {
          const error = hint.originalException;
          if (error instanceof Error) {
            // Don't send network errors in development
            if (error.message.includes('Failed to fetch') && !isProduction) {
              return null;
            }
            
            // Don't send CORS errors in development
            if (error.message.includes('CORS') && !isProduction) {
              return null;
            }
          }
        }
        
        return event;
      },
      
      // Add user context
      beforeSendTransaction(event) {
        // Add custom transaction context
        event.tags = {
          ...event.tags,
          component: 'marketing-analytics-dashboard',
        };
        
        return event;
      },
    });

    debugLogger.info('Sentry', 'Sentry initialized successfully', {
      environment: import.meta.env.MODE,
      dsn: sentryDsn.substring(0, 20) + '...', // Log partial DSN for verification
    });
  } catch (error) {
    debugLogger.error('Sentry', 'Failed to initialize Sentry', error);
  }
};

/**
 * Set user context for Sentry
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  name?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

/**
 * Add breadcrumb for debugging
 */
export const addSentryBreadcrumb = (message: string, category: string, data?: any) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

/**
 * Capture exception manually
 */
export const captureSentryException = (error: Error, context?: any) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
};

/**
 * Capture message manually
 */
export const captureSentryMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

