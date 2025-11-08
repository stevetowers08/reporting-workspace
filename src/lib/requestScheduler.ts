/**
 * Request Scheduler with Priority Queue
 * Prioritizes critical requests to improve perceived performance
 * 
 * Priority levels:
 * - CRITICAL: User-visible data that blocks UI rendering
 * - HIGH: Important metrics needed for main views
 * - NORMAL: Standard data requests
 * - LOW: Background updates, non-essential data
 */

import { debugLogger } from './debug';

export enum RequestPriority {
  CRITICAL = 1,  // User-visible data (summary metrics, main dashboard)
  HIGH = 2,      // Important metrics (platform-specific data)
  NORMAL = 3,    // Standard data (detailed breakdowns)
  LOW = 4        // Background updates (non-essential data)
}

interface QueuedRequest<T> {
  priority: RequestPriority;
  requestFn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  id: string;
}

export class RequestScheduler {
  private queue: QueuedRequest<any>[] = [];
  private isProcessing = false;
  private maxConcurrent = 3; // Process up to 3 requests concurrently
  private activeRequests = 0;
  private requestIdCounter = 0;

  /**
   * Schedule a request with priority
   */
  async schedule<T>(
    requestFn: () => Promise<T>,
    priority: RequestPriority = RequestPriority.NORMAL
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        priority,
        requestFn,
        resolve,
        reject,
        timestamp: Date.now(),
        id: `req-${++this.requestIdCounter}`
      };

      // Insert into queue based on priority (lower number = higher priority)
      this.insertByPriority(request);
      
      debugLogger.debug('RequestScheduler', `Request queued`, {
        id: request.id,
        priority: RequestPriority[priority],
        queueLength: this.queue.length
      });

      // Start processing if not already running
      this.processQueue();
    });
  }

  /**
   * Insert request into queue maintaining priority order
   */
  private insertByPriority(request: QueuedRequest<any>): void {
    let insertIndex = this.queue.length;
    
    // Find insertion point (lower priority number = higher priority)
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > request.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, request);
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      debugLogger.debug('RequestScheduler', 'Queue already processing, skipping');
      return;
    }
    
    if (this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    debugLogger.debug('RequestScheduler', 'Starting queue processing', {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests
    });

    try {
      while (this.queue.length > 0 || this.activeRequests > 0) {
        // Process requests up to maxConcurrent limit
        while (this.activeRequests < this.maxConcurrent && this.queue.length > 0) {
          const request = this.queue.shift();
          if (!request) break;

          this.activeRequests++;
          // Don't await - let requests run concurrently
          this.executeRequest(request).catch(error => {
            debugLogger.error('RequestScheduler', 'Unhandled error in executeRequest', {
              requestId: request.id,
              error: error instanceof Error ? error.message : String(error)
            });
          });
        }

        // Wait a bit before checking again if there are still items in queue
        if (this.queue.length > 0) {
          await this.delay(10);
        } else if (this.activeRequests > 0) {
          // Wait for active requests to complete
          await this.delay(50);
        }
      }
    } catch (error) {
      debugLogger.error('RequestScheduler', 'Error in processQueue', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      this.isProcessing = false;
      debugLogger.debug('RequestScheduler', 'Queue processing completed', {
        remainingQueueLength: this.queue.length,
        activeRequests: this.activeRequests
      });
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    const waitTime = Date.now() - request.timestamp;
    
    debugLogger.debug('RequestScheduler', `Executing request`, {
      id: request.id,
      priority: RequestPriority[request.priority],
      waitTime: `${waitTime}ms`,
      activeRequests: this.activeRequests
    });

    try {
      const result = await request.requestFn();
      request.resolve(result);
      
      debugLogger.debug('RequestScheduler', `Request completed`, {
        id: request.id,
        totalTime: `${Date.now() - request.timestamp}ms`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      debugLogger.error('RequestScheduler', `Request failed`, {
        id: request.id,
        error: errorMessage,
        stack: errorStack
      });
      
      // Ensure we reject with a proper Error object
      const rejectError = error instanceof Error ? error : new Error(errorMessage);
      request.reject(rejectError);
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueLength: number;
    activeRequests: number;
    priorityBreakdown: Record<string, number>;
  } {
    const priorityBreakdown: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      NORMAL: 0,
      LOW: 0
    };

    this.queue.forEach(req => {
      priorityBreakdown[RequestPriority[req.priority]]++;
    });

    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      priorityBreakdown
    };
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.forEach(req => {
      req.reject(new Error('Request cancelled: queue cleared'));
    });
    this.queue = [];
    debugLogger.info('RequestScheduler', 'Queue cleared');
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global request scheduler instance
export const requestScheduler = new RequestScheduler();

/**
 * Helper function to schedule a request with priority
 */
export async function scheduleRequest<T>(
  requestFn: () => Promise<T>,
  priority: RequestPriority = RequestPriority.NORMAL
): Promise<T> {
  return requestScheduler.schedule(requestFn, priority);
}

/**
 * Helper to determine priority based on request type
 */
export function getPriorityForRequestType(type: 'summary' | 'platform' | 'detailed' | 'background'): RequestPriority {
  switch (type) {
    case 'summary':
      return RequestPriority.CRITICAL;
    case 'platform':
      return RequestPriority.HIGH;
    case 'detailed':
      return RequestPriority.NORMAL;
    case 'background':
      return RequestPriority.LOW;
    default:
      return RequestPriority.NORMAL;
  }
}

