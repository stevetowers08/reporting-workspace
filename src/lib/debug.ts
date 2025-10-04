// Comprehensive debugging utilities
export interface DebugLog {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    category: string;
    message: string;
    data?: any;
    stack?: string;
}

class DebugLogger {
    private logs: DebugLog[] = [];
    private maxLogs = 1000;
    private isEnabled = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
    private enableConsoleOutput = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

    log(level: DebugLog['level'], category: string, message: string, data?: any) {
        if (!this.isEnabled) return;

        const log: DebugLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : undefined,
            stack: level === 'error' ? new Error().stack : undefined
        };

        this.logs.unshift(log);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        // Console output with styling (only in development)
        if (this.enableConsoleOutput) {
            const style = this.getConsoleStyle(level);
            console.log(
                `%c[${category}] ${message}`,
                style,
                data || ''
            );
        }

        // Store in localStorage for persistence across refreshes
        this.persistLogs();
    }

    info(category: string, message: string, data?: any) {
        this.log('info', category, message, data);
    }

    warn(category: string, message: string, data?: any) {
        this.log('warn', category, message, data);
    }

    error(category: string, message: string, data?: any) {
        this.log('error', category, message, data);
    }

    debug(category: string, message: string, data?: any) {
        this.log('debug', category, message, data);
    }

    getLogs(filter?: { level?: DebugLog['level']; category?: string }) {
        if (!filter) return this.logs;

        return this.logs.filter(log => {
            if (filter.level && log.level !== filter.level) return false;
            if (filter.category && !log.category.includes(filter.category)) return false;
            return true;
        });
    }

    clearLogs() {
        this.logs = [];
        localStorage.removeItem('debug_logs');
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    private getConsoleStyle(level: DebugLog['level']): string {
        const styles = {
            info: 'color: #0066cc; font-weight: bold;',
            warn: 'color: #ff6600; font-weight: bold;',
            error: 'color: #cc0000; font-weight: bold; background: #ffe6e6;',
            debug: 'color: #666666; font-style: italic;'
        };
        return styles[level];
    }

    private persistLogs() {
        try {
            localStorage.setItem('debug_logs', JSON.stringify(this.logs.slice(0, 100))); // Keep last 100 logs
        } catch (error) {
            if (this.enableConsoleOutput) {
                console.warn('Failed to persist debug logs:', error);
            }
        }
    }

    loadPersistedLogs() {
        try {
            const stored = localStorage.getItem('debug_logs');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.logs = parsed.concat(this.logs);
            }
        } catch (error) {
            if (this.enableConsoleOutput) {
                console.warn('Failed to load persisted debug logs:', error);
            }
        }
    }
}

export const debugLogger = new DebugLogger();

// Auto-load persisted logs on initialization
debugLogger.loadPersistedLogs();

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    debugLogger.error('GLOBAL_ERROR', 'Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    debugLogger.error('PROMISE_REJECTION', 'Unhandled promise rejection', {
      reason: event.reason,
      promise: event.promise
    });
  });
}

// API request interceptor
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const startTime = Date.now();

    debugLogger.info('API_REQUEST', `Fetching ${url}`, {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body
    });

    try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        debugLogger.info('API_RESPONSE', `Response from ${url}`, {
            status: response.status,
            statusText: response.statusText,
            duration: `${duration}ms`,
            headers: Object.fromEntries(response.headers.entries())
        });

        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        debugLogger.error('API_ERROR', `Request failed for ${url}`, {
            error: error instanceof Error ? error.message : error,
            duration: `${duration}ms`
        });
        throw error;
    }
  };
}

// React component debugging
export const debugComponent = (componentName: string) => {
  return {
    mount: (props?: any) => debugLogger.debug('COMPONENT', `${componentName} mounted`, props),
    unmount: () => debugLogger.debug('COMPONENT', `${componentName} unmounted`),
    update: (props?: any, prevProps?: any) => debugLogger.debug('COMPONENT', `${componentName} updated`, { props, prevProps }),
    render: (props?: any) => debugLogger.debug('COMPONENT', `${componentName} render`, props)
  };
};

// Database operation debugging
export const debugDatabase = {
    query: (operation: string, table: string, data?: any) => {
        debugLogger.info('DATABASE', `${operation} on ${table}`, data);
    },
    success: (operation: string, table: string, result?: any) => {
        debugLogger.info('DATABASE', `${operation} success on ${table}`, { resultCount: Array.isArray(result) ? result.length : 1 });
    },
    error: (operation: string, table: string, error: any) => {
        debugLogger.error('DATABASE', `${operation} failed on ${table}`, error);
    }
};

// Service debugging
export const debugService = {
    call: (serviceName: string, method: string, params?: any) => {
        debugLogger.info('SERVICE', `${serviceName}.${method} called`, params);
    },
    success: (serviceName: string, method: string, result?: any) => {
        debugLogger.info('SERVICE', `${serviceName}.${method} success`, { resultType: typeof result });
    },
    error: (serviceName: string, method: string, error: any) => {
        debugLogger.error('SERVICE', `${serviceName}.${method} failed`, error);
    }
};

export default debugLogger;
