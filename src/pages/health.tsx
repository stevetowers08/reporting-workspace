import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { TokenManager } from '@/services/auth/TokenManager';
import { IntegrationService } from '@/services/integration/IntegrationService';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    integrations: 'operational' | 'degraded' | 'error';
    cache: 'optimal' | 'degraded' | 'error';
    authentication: 'operational' | 'degraded' | 'error';
  };
  metrics: {
    responseTime: number;
    memoryUsage?: number;
    uptime: number;
  };
  version: string;
  environment: string;
}

/**
 * Health Check Component for Production Monitoring
 * 
 * Provides comprehensive health status including:
 * - Database connectivity
 * - Integration services status
 * - Cache performance
 * - Authentication system
 * - Performance metrics
 */
export const HealthCheck = async (): Promise<HealthStatus> => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    debugLogger.info('HealthCheck', 'Starting health check');
    
    // Check database connectivity
    const databaseStatus = await checkDatabaseHealth();
    
    // Check integrations status
    const integrationsStatus = await checkIntegrationsHealth();
    
    // Check cache performance
    const cacheStatus = await checkCacheHealth();
    
    // Check authentication system
    const authStatus = await checkAuthHealth();
    
    // Calculate overall status
    const overallStatus = calculateOverallStatus([
      databaseStatus,
      integrationsStatus,
      cacheStatus,
      authStatus
    ]);
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp,
      services: {
        database: databaseStatus,
        integrations: integrationsStatus,
        cache: cacheStatus,
        authentication: authStatus,
      },
      metrics: {
        responseTime,
        memoryUsage: getMemoryUsage(),
        uptime: getUptime(),
      },
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE || 'development',
    };
    
    debugLogger.info('HealthCheck', 'Health check completed', healthStatus);
    return healthStatus;
    
  } catch (error) {
    debugLogger.error('HealthCheck', 'Health check failed', error);
    
    return {
      status: 'unhealthy',
      timestamp,
      services: {
        database: 'error',
        integrations: 'error',
        cache: 'error',
        authentication: 'error',
      },
      metrics: {
        responseTime: Date.now() - startTime,
        uptime: getUptime(),
      },
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE || 'development',
    };
  }
};

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth(): Promise<'connected' | 'disconnected' | 'error'> {
  try {
    const startTime = Date.now();
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      debugLogger.warn('HealthCheck', 'Database error', error);
      return 'error';
    }
    
    if (responseTime > 5000) { // 5 seconds
      debugLogger.warn('HealthCheck', 'Database slow response', { responseTime });
      return 'disconnected';
    }
    
    debugLogger.debug('HealthCheck', 'Database healthy', { responseTime });
    return 'connected';
    
  } catch (error) {
    debugLogger.error('HealthCheck', 'Database check failed', error);
    return 'error';
  }
}

/**
 * Check integrations service health
 */
async function checkIntegrationsHealth(): Promise<'operational' | 'degraded' | 'error'> {
  try {
    // Check if we can fetch integrations
    const integrations = await IntegrationService.getAllIntegrations();
    
    if (!integrations) {
      return 'error';
    }
    
    // Check if any integrations are in error state
    const errorCount = integrations.filter(integration => 
      integration.syncStatus === 'error'
    ).length;
    
    if (errorCount > integrations.length / 2) {
      return 'degraded';
    }
    
    return 'operational';
    
  } catch (error) {
    debugLogger.error('HealthCheck', 'Integrations check failed', error);
    return 'error';
  }
}

/**
 * Check cache performance
 */
async function checkCacheHealth(): Promise<'optimal' | 'degraded' | 'error'> {
  try {
    // Simple cache test - this would be more sophisticated in production
    const testKey = 'health-check-test';
    const testValue = { timestamp: Date.now() };
    
    // Test localStorage (if available)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(testKey, JSON.stringify(testValue));
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (!retrieved) {
        return 'error';
      }
    }
    
    return 'optimal';
    
  } catch (error) {
    debugLogger.error('HealthCheck', 'Cache check failed', error);
    return 'error';
  }
}

/**
 * Check authentication system health
 */
async function checkAuthHealth(): Promise<'operational' | 'degraded' | 'error'> {
  try {
    // Check if TokenManager is working
    const connectedPlatforms = await TokenManager.getConnectedPlatforms();
    
    if (connectedPlatforms.length === 0) {
      return 'degraded'; // No integrations connected, but system is working
    }
    
    return 'operational';
    
  } catch (error) {
    debugLogger.error('HealthCheck', 'Auth check failed', error);
    return 'error';
  }
}

/**
 * Calculate overall health status based on individual service statuses
 */
function calculateOverallStatus(statuses: Array<'connected' | 'disconnected' | 'error' | 'operational' | 'degraded'>): 'healthy' | 'degraded' | 'unhealthy' {
  const errorCount = statuses.filter(status => status === 'error').length;
  const degradedCount = statuses.filter(status => status === 'degraded' || status === 'disconnected').length;
  
  if (errorCount > 0) {
    return 'unhealthy';
  }
  
  if (degradedCount > statuses.length / 2) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Get memory usage (if available)
 */
function getMemoryUsage(): number | undefined {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;
    return memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : undefined;
  }
  return undefined;
}

/**
 * Get application uptime
 */
function getUptime(): number {
  if (typeof window !== 'undefined' && window.performance) {
    return Math.round(performance.now() / 1000); // Convert to seconds
  }
  return 0;
}

/**
 * Health check endpoint for API routes
 */
export const healthCheckEndpoint = async (): Promise<Response> => {
  try {
    const healthStatus = await HealthCheck();
    
    return new Response(JSON.stringify(healthStatus), {
      status: healthStatus.status === 'healthy' ? 200 : 
              healthStatus.status === 'degraded' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    debugLogger.error('HealthCheck', 'Health check endpoint failed', error);
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

