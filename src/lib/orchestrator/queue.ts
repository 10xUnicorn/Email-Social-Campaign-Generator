import { v4 as uuidv4 } from 'uuid';

export interface PublishJob {
  id: string;
  submissionId: string;
  destinationKey: string;
  campaignId: string;
  orgId: string;
  mode: 'dry_run' | 'live';
  priority: number; // Higher = earlier
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retries: number;
  maxRetries: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byDestination: Record<string, { pending: number; processing: number; completed: number; failed: number }>;
}

/**
 * In-memory queue manager for MVP
 * TODO: Replace with BullMQ for production
 */
export class QueueManager {
  private jobsByDestination: Map<string, PublishJob[]> = new Map();
  private allJobs: Map<string, PublishJob> = new Map();
  private processingJobs: Map<string, PublishJob> = new Map();
  private rateLimitState: Map<string, { lastPublishTime: number }> = new Map();

  constructor() {}

  /**
   * Enqueue a job with priority and destination grouping
   */
  enqueue(job: Omit<PublishJob, 'id' | 'createdAt' | 'status' | 'retries'>): PublishJob {
    const newJob: PublishJob = {
      ...job,
      id: uuidv4(),
      createdAt: new Date(),
      status: 'pending',
      retries: 0,
    };

    this.allJobs.set(newJob.id, newJob);

    // Group by destination
    const destKey = job.destinationKey;
    if (!this.jobsByDestination.has(destKey)) {
      this.jobsByDestination.set(destKey, []);
    }

    const queue = this.jobsByDestination.get(destKey)!;
    queue.push(newJob);
    queue.sort((a, b) => b.priority - a.priority); // Higher priority first

    return newJob;
  }

  /**
   * Dequeue next job for a destination, respecting rate limits
   */
  dequeue(destinationKey: string): PublishJob | null {
    const queue = this.jobsByDestination.get(destinationKey);
    if (!queue || queue.length === 0) {
      return null;
    }

    const job = queue.shift()!;
    this.processingJobs.set(job.id, job);
    job.status = 'processing';
    job.startedAt = new Date();

    return job;
  }

  /**
   * Mark a job as completed
   */
  completeJob(jobId: string): void {
    const job = this.allJobs.get(jobId);
    if (!job) return;

    job.status = 'completed';
    job.completedAt = new Date();
    this.processingJobs.delete(jobId);

    // Update rate limit tracking
    this.rateLimitState.set(job.destinationKey, {
      lastPublishTime: Date.now(),
    });
  }

  /**
   * Mark a job as failed
   */
  failJob(jobId: string, error: string): void {
    const job = this.allJobs.get(jobId);
    if (!job) return;

    job.error = error;
    job.completedAt = new Date();
    this.processingJobs.delete(jobId);

    // Check if retryable and under retry limit
    if (job.retries < job.maxRetries) {
      job.retries++;
      job.status = 'pending';

      // Re-enqueue with slight delay
      setTimeout(() => {
        const queue = this.jobsByDestination.get(job.destinationKey);
        if (queue) {
          queue.push(job);
          queue.sort((a, b) => b.priority - a.priority);
        }
      }, Math.pow(2, job.retries) * 1000); // Exponential backoff
    } else {
      job.status = 'failed';
    }
  }

  /**
   * Get the next job to process from any destination
   */
  getNextJob(): PublishJob | null {
    // Find destination with pending jobs, prioritizing those with oldest last publish
    let selectedDestination: string | null = null;
    let oldestLastPublish = Date.now();

    for (const [destKey, queue] of this.jobsByDestination.entries()) {
      if (queue.length > 0) {
        const lastPublish = this.rateLimitState.get(destKey)?.lastPublishTime ?? 0;
        if (lastPublish < oldestLastPublish) {
          oldestLastPublish = lastPublish;
          selectedDestination = destKey;
        }
      }
    }

    if (!selectedDestination) {
      return null;
    }

    return this.dequeue(selectedDestination);
  }

  /**
   * Get current queue statistics
   */
  getStats(): QueueStats {
    const stats: QueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byDestination: {},
    };

    for (const job of this.allJobs.values()) {
      if (job.status === 'pending') stats.pending++;
      else if (job.status === 'processing') stats.processing++;
      else if (job.status === 'completed') stats.completed++;
      else if (job.status === 'failed') stats.failed++;
    }

    // Per-destination stats
    for (const [destKey, queue] of this.jobsByDestination.entries()) {
      if (!stats.byDestination[destKey]) {
        stats.byDestination[destKey] = {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        };
      }

      for (const job of queue) {
        if (job.status === 'pending') stats.byDestination[destKey].pending++;
        else if (job.status === 'processing') stats.byDestination[destKey].processing++;
        else if (job.status === 'completed') stats.byDestination[destKey].completed++;
        else if (job.status === 'failed') stats.byDestination[destKey].failed++;
      }
    }

    return stats;
  }

  /**
   * Check if rate limited for destination
   * Returns milliseconds to wait, or 0 if not rate limited
   */
  checkRateLimit(destinationKey: string, maxPerHour: number): number {
    const state = this.rateLimitState.get(destinationKey);
    if (!state) return 0;

    const msPerRequest = (3600 * 1000) / maxPerHour;
    const timeSinceLastPublish = Date.now() - state.lastPublishTime;

    if (timeSinceLastPublish < msPerRequest) {
      return msPerRequest - timeSinceLastPublish;
    }

    return 0;
  }

  /**
   * Get a specific job
   */
  getJob(jobId: string): PublishJob | undefined {
    return this.allJobs.get(jobId);
  }

  /**
   * Get all jobs for a campaign
   */
  getJobsByCampaign(campaignId: string): PublishJob[] {
    const result: PublishJob[] = [];
    for (const job of this.allJobs.values()) {
      if (job.campaignId === campaignId) {
        result.push(job);
      }
    }
    return result;
  }

  /**
   * Clear all jobs (for testing)
   */
  clear(): void {
    this.jobsByDestination.clear();
    this.allJobs.clear();
    this.processingJobs.clear();
    this.rateLimitState.clear();
  }
}

/*
 * BullMQ interface for future migration:
 *
 * export class BullQueueManager implements IQueueManager {
 *   private queues: Map<string, Queue<PublishJob>>;
 *   private worker: Worker;
 *
 *   constructor(redisUrl: string) {
 *     this.queues = new Map();
 *   }
 *
 *   async enqueue(job: PublishJob): Promise<void> {
 *     const queue = this.getOrCreateQueue(job.destinationKey);
 *     await queue.add(job, {
 *       priority: job.priority,
 *       attempts: job.maxRetries,
 *       backoff: { type: 'exponential', delay: 1000 }
 *     });
 *   }
 *
 *   async processQueue(): Promise<void> {
 *     this.worker = new Worker('publish-queue', handler, { connection });
 *   }
 * }
 */
