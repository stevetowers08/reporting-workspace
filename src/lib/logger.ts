// Development Logger
// Provides controlled debug logging with platform-specific controls

import { DEBUG_CONFIG, shouldLog, DebugPlatform, DebugFeature, LogLevel } from './debug-config';

export class DevLogger {
  private static formatMessage(platform: string, message: string, level: LogLevel = 'info'): string {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    const levelEmoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    }[level] || 'ℹ️';
    
    return `${levelEmoji} [${timestamp}] ${platform}: ${message}`;
  }

  private static shouldLog(platform?: DebugPlatform, feature?: DebugFeature): boolean {
    return shouldLog(platform, feature);
  }

  // Debug level logging
  static debug(platform: string, message: string, data?: any, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    if (DEBUG_CONFIG.logLevel === 'error' || DEBUG_CONFIG.logLevel === 'warn') {return;}
    
    const formattedMessage = this.formatMessage(platform, message, 'debug');
  }

  // Info level logging
  static info(platform: string, message: string, data?: any, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    if (DEBUG_CONFIG.logLevel === 'error') {return;}
    
    const formattedMessage = this.formatMessage(platform, message, 'info');
  }

  // Warning level logging
  static warn(platform: string, message: string, data?: any, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    
    const formattedMessage = this.formatMessage(platform, message, 'warn');
  }

  // Error level logging
  static error(platform: string, message: string, error?: any, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    
    const formattedMessage = this.formatMessage(platform, message, 'error');
  }

  // Success level logging
  static success(platform: string, message: string, data?: any, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    if (DEBUG_CONFIG.logLevel === 'error') {return;}
    
    const formattedMessage = this.formatMessage(platform, message, 'success');
  }

  // Performance timing
  static time(platform: string, label: string, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    if (!DEBUG_CONFIG.features.performance) {return;}
    
    console.time(`⏱️ ${platform}: ${label}`);
  }

  static timeEnd(platform: string, label: string, debugPlatform?: DebugPlatform, debugFeature?: DebugFeature) {
    if (!this.shouldLog(debugPlatform, debugFeature)) {return;}
    if (!DEBUG_CONFIG.features.performance) {return;}
    
    console.timeEnd(`⏱️ ${platform}: ${label}`);
  }

  // Network request logging
  static network(platform: string, method: string, url: string, status?: number, debugPlatform?: DebugPlatform) {
    if (!this.shouldLog(debugPlatform, 'network')) {return;}
    
    const statusEmoji = status ? (status >= 200 && status < 300 ? '✅' : '❌') : '🔄';
    const message = `${statusEmoji} ${method.toUpperCase()} ${url}${status ? ` (${status})` : ''}`;
    const formattedMessage = this.formatMessage(platform, message, 'info');
  }

  // Token logging (with masking for security)
  static token(platform: string, action: string, token?: string, debugPlatform?: DebugPlatform) {
    if (!this.shouldLog(debugPlatform, 'tokens')) {return;}
    
    const maskedToken = token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : 'undefined';
    const message = `${action}: ${maskedToken}`;
    const formattedMessage = this.formatMessage(platform, message, 'debug');
  }

  // Cache logging
  static cache(platform: string, action: string, key: string, hit?: boolean, debugPlatform?: DebugPlatform) {
    if (!this.shouldLog(debugPlatform, 'cache')) {return;}
    
    const hitEmoji = hit !== undefined ? (hit ? '✅' : '❌') : '🔄';
    const message = `${hitEmoji} ${action}: ${key}`;
    const formattedMessage = this.formatMessage(platform, message, 'debug');
  }

  // Group logging for related operations
  static group(platform: string, title: string, debugPlatform?: DebugPlatform) {
    if (!this.shouldLog(debugPlatform)) {return;}
    
    console.group(`📁 ${platform}: ${title}`);
  }

  static groupEnd() {
    console.groupEnd();
  }

  // Table logging for structured data
  static table(platform: string, title: string, data: any, debugPlatform?: DebugPlatform) {
    if (!this.shouldLog(debugPlatform)) {return;}
    
    console.table(data);
  }

  // Get current debug status
  static getStatus() {
    return {
      enabled: DEBUG_CONFIG.enabled,
      logLevel: DEBUG_CONFIG.logLevel,
      platforms: Object.entries(DEBUG_CONFIG.platforms)
        .filter(([_, enabled]) => enabled)
        .map(([platform, _]) => platform),
      features: Object.entries(DEBUG_CONFIG.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature)
    };
  }
}

// Convenience functions for common platforms
export const debugLogger = {
  facebook: (message: string, data?: any) => DevLogger.info('FacebookAds', message, data, 'facebook'),
  google: (message: string, data?: any) => DevLogger.info('GoogleAds', message, data, 'google'),
  ghl: (message: string, data?: any) => DevLogger.info('GoHighLevel', message, data, 'ghl'),
  sheets: (message: string, data?: any) => DevLogger.info('GoogleSheets', message, data, 'sheets'),
  auth: (message: string, data?: any) => DevLogger.info('Auth', message, data, 'auth'),
  api: (message: string, data?: any) => DevLogger.info('API', message, data, 'api'),
  database: (message: string, data?: any) => DevLogger.info('Database', message, data, 'database')
};

export default DevLogger;
