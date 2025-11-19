
/**
 * Performance Manager
 * Handles request queueing, caching, and retries.
 */

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

class PerformanceManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private queue: Promise<any> = Promise.resolve();
  private CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  /**
   * Queues a task to ensure no more than N concurrent heavy model calls happen.
   * For simplicity in this demo, we serialize specific heavy tasks.
   */
  async queueTask<T>(taskFn: () => Promise<T>): Promise<T> {
    // Simple serialization to avoid rate limits
    const task = this.queue.then(async () => {
        try {
            return await this.retryWithBackoff(taskFn);
        } catch (e) {
            throw e;
        }
    });
    // We append to queue but return the result of this specific task
    this.queue = task.catch(() => {}); // Catch to keep queue alive
    return task;
  }

  /**
   * Check cache before running.
   */
  async getCachedOrRun<T>(key: string, taskFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`[Performance] Cache hit for ${key}`);
      return cached.data;
    }

    console.log(`[Performance] Cache miss for ${key}, running task...`);
    const result = await this.queueTask(taskFn);
    
    this.cache.set(key, {
      timestamp: Date.now(),
      data: result
    });

    return result;
  }

  /**
   * Exponential backoff retry
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      // Check for quota or server errors
      const isRetryable = err.message?.includes('429') || err.message?.includes('503') || err.message?.includes('quota');
      
      if (retries > 0 && isRetryable) {
        console.warn(`[Performance] Retrying task... Attempts left: ${retries}`);
        await new Promise(res => setTimeout(res, delay));
        return this.retryWithBackoff(fn, retries - 1, delay * 2);
      }
      throw err;
    }
  }

  logPerfEvent(event: string) {
      console.log(`[Performance Event] ${new Date().toISOString()}: ${event}`);
  }
}

export const perfManager = new PerformanceManager();
