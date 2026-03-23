import { v4 as uuidv4 } from 'uuid';
import { mockDb, PublishRun } from '@/lib/utils/mock-db';
import { QueueManager, PublishJob } from './queue';
import { ConnectorRegistry, connectorRegistry } from '@/lib/connectors/registry';
import { BaseConnector } from '@/lib/connectors/base';
import { Campaign, ContentAsset, DestinationSubmission } from '@/types/index';
import { UTMGenerator } from '@/lib/analytics/utm-generator';
import { AnalyticsTracker } from '@/lib/analytics/tracker';

interface RateLimitConfig {
  maxPerHour: number;
  jitterMs: number;
}

interface ProcessJobResult {
  success: boolean;
  submissionId: string;
  error?: string;
  retryable?: boolean;
  publishedUrl?: string;
  externalId?: string;
}

/**
 * PublishOrchestrator coordinates the entire publishing workflow
 * Manages job queuing, rate limiting, validation, mapping, and publishing
 */
export class PublishOrchestrator {
  private queueManager: QueueManager;
  private connectorRegistry: ConnectorRegistry;
  private utmGenerator: UTMGenerator;
  private analyticsTracker: AnalyticsTracker;
  private destinationConfig: Map<string, RateLimitConfig>;
  private isProcessing: boolean = false;

  constructor() {
    this.queueManager = new QueueManager();
    this.connectorRegistry = connectorRegistry;
    this.utmGenerator = new UTMGenerator();
    this.analyticsTracker = new AnalyticsTracker();
    this.destinationConfig = this.initializeDestinationConfig();
  }

  /**
   * Initialize destination rate limit configurations
   */
  private initializeDestinationConfig(): Map<string, RateLimitConfig> {
    const config = new Map<string, RateLimitConfig>();

    // Default configs - can be customized per destination
    config.set('mastodon', { maxPerHour: 60, jitterMs: 1000 });
    config.set('wordpress', { maxPerHour: 20, jitterMs: 2000 });
    config.set('forem-dev', { maxPerHour: 30, jitterMs: 1500 });
    config.set('bluesky', { maxPerHour: 300, jitterMs: 500 });
    config.set('indexnow', { maxPerHour: 100, jitterMs: 1000 });
    config.set('rss-generator', { maxPerHour: 10, jitterMs: 500 });
    config.set('medium-pack', { maxPerHour: 5, jitterMs: 3000 });
    config.set('prlog-pack', { maxPerHour: 5, jitterMs: 3000 });
    config.set('community-packs', { maxPerHour: 5, jitterMs: 3000 });

    return config;
  }

  /**
   * Start a publish run for a campaign
   * Creates submissions for all assets and destinations, enqueues jobs
   */
  async startRun(
    campaignId: string,
    mode: 'dry_run' | 'live',
    orgId: string
  ): Promise<PublishRun> {
    const campaign = mockDb.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Create run record
    const run = mockDb.createRun({
      campaignId,
      orgId,
      mode,
      status: 'running',
    });

    try {
      // Get all assets for campaign
      const assets = mockDb.getAssetsByCampaign(campaignId);
      if (assets.length === 0) {
        throw new Error('Campaign has no assets to publish');
      }

      // Get available destinations from registry
      const destinations = this.connectorRegistry.getAllDestinations();

      // Create submissions and enqueue jobs
      let jobCount = 0;
      for (const asset of assets) {
        for (const destination of destinations) {
          const submission = mockDb.createSubmission({
            assetId: asset.id,
            destinationId: destination.key,
            campaignId,
            orgId,
            status: 'queued',
            idempotencyKey: this.generateIdempotencyKey(asset.id, destination.key),
            attempts: 0,
          });

          // Enqueue job
          const job = this.queueManager.enqueue({
            submissionId: submission.id,
            destinationKey: destination.key,
            campaignId,
            orgId,
            mode,
            priority: 1, // Base priority
            maxRetries: 3,
          });

          jobCount++;
        }
      }

      // Start background processing
      this.processQueueInBackground();

      return run;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      mockDb.updateRun(run.id, {
        status: 'failed',
        completedAt: new Date(),
      });
      throw error;
    }
  }

  /**
   * Process a single job from the queue
   */
  async processJob(submissionId: string): Promise<ProcessJobResult> {
    try {
      const submission = mockDb.getSubmission(submissionId);
      if (!submission) {
        return {
          success: false,
          submissionId,
          error: 'Submission not found',
          retryable: false,
        };
      }

      // Update status
      mockDb.updateSubmission(submissionId, { status: 'sending' });

      // Load asset and campaign
      const asset = mockDb.getAsset(submission.assetId);
      if (!asset) {
        return {
          success: false,
          submissionId,
          error: 'Asset not found',
          retryable: false,
        };
      }

      const campaign = mockDb.getCampaign(submission.campaignId);
      if (!campaign) {
        return {
          success: false,
          submissionId,
          error: 'Campaign not found',
          retryable: false,
        };
      }

      // Get connector
      const connector = this.connectorRegistry.getConnector(submission.destinationId);
      if (!connector) {
        return {
          success: false,
          submissionId,
          error: `Connector not found: ${submission.destinationId}`,
          retryable: false,
        };
      }

      // Check rate limit
      const rateLimitWait = this.checkRateLimit(submission.destinationId, submission.orgId);
      if (rateLimitWait > 0) {
        // Return to queue
        return {
          success: false,
          submissionId,
          error: `Rate limited - waiting ${rateLimitWait}ms`,
          retryable: true,
        };
      }

      // Validate asset for destination
      const validationResult = await connector.validate(asset, {});
      if (!validationResult.isValid) {
        const errors = validationResult.errors.map((e: any) => e.message).join('; ');
        return {
          success: false,
          submissionId,
          error: `Validation failed: ${errors}`,
          retryable: false,
        };
      }

      // Map fields to destination format
      const mappedPayload = await connector.mapFields(asset, campaign);

      // Check if assisted destination (requires buildPack)
      const destConfig = this.connectorRegistry.getDestinationConfig(submission.destinationId);
      if (destConfig?.group === 'assist') {
        // For assisted destinations, build and store pack instead of publishing
        const pack = await this.buildAssistedPack(connector, asset, campaign);
        await this.handleResult(submissionId, {
          success: true,
          externalId: `pack-${uuidv4()}`,
          metadata: { packData: pack },
        });
        return {
          success: true,
          submissionId,
        };
      }

      // Publish to destination (skip for dry_run)
      const job = this.queueManager.getJob(submissionId);
      if (job?.mode === 'dry_run') {
        // Simulate successful publish
        const simulatedResult = {
          success: true,
          externalId: `dry-run-${uuidv4()}`,
          publishedUrl: `https://example.com/simulated`,
        };
        await this.handleResult(submissionId, simulatedResult);
        return {
          success: true,
          submissionId,
          externalId: simulatedResult.externalId,
          publishedUrl: simulatedResult.publishedUrl,
        };
      }

      const publishResult = await connector.publish(mappedPayload, {});

      // Handle result
      await this.handleResult(submissionId, publishResult);

      return {
        success: publishResult.success,
        submissionId,
        error: publishResult.error?.message,
        retryable: publishResult.retryable,
        externalId: publishResult.externalId,
        publishedUrl: publishResult.publishedUrl,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        submissionId,
        error: errorMsg,
        retryable: true,
      };
    }
  }

  /**
   * Handle publish result and update tracking
   */
  private async handleResult(
    submissionId: string,
    result: any
  ): Promise<void> {
    const submission = mockDb.getSubmission(submissionId);
    if (!submission) return;

    if (result.success) {
      mockDb.updateSubmission(submissionId, {
        status: 'sent',
        externalId: result.externalId,
        publishedUrl: result.publishedUrl,
        attempts: submission.attempts + 1,
      });

      // Create tracking link if published URL provided
      if (result.publishedUrl && submission.campaignId) {
        const asset = mockDb.getAsset(submission.assetId);
        if (asset) {
          const trackingLink = this.utmGenerator.generateTrackingLink(
            result.publishedUrl,
            submission.campaignId,
            submission.destinationId,
            asset.assetType
          );

          mockDb.createTrackingLink({
            submissionId,
            campaignId: submission.campaignId,
            redirectUrl: trackingLink,
            originalUrl: result.publishedUrl,
            clicks: 0,
          });
        }
      }

      // Record analytics event
      this.analyticsTracker.recordPublishEvent(submissionId, 'sent', {
        destinationKey: submission.destinationId,
        externalId: result.externalId,
      });
    } else {
      mockDb.updateSubmission(submissionId, {
        status: 'failed',
        errorLog: result.error?.message || String(result.error),
        attempts: submission.attempts + 1,
        lastAttemptAt: new Date(),
      });

      this.analyticsTracker.recordPublishEvent(submissionId, 'failed', {
        destinationKey: submission.destinationId,
        error: result.error?.message || String(result.error),
      });
    }
  }

  /**
   * Build assisted pack for destinations that require user guidance
   */
  private async buildAssistedPack(
    connector: BaseConnector,
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<any> {
    // Call buildPack if available on connector
    if ('buildPack' in connector && typeof connector.buildPack === 'function') {
      return await (connector as any).buildPack(asset, campaign);
    }

    // Fallback: just return mapped fields
    const mapped = await connector.mapFields(asset, campaign);
    return {
      destinationKey: connector.getDestinationConfig().key,
      copyReadyText: mapped.title || '',
      fieldMappings: Object.entries(mapped).map(([key, value]) => ({
        sourceField: key,
        targetField: key,
        required: true,
      })),
      submissionInstructions: 'Please follow destination guidelines for submission',
    };
  }

  /**
   * Get rate limit configuration for a destination
   */
  getRateLimit(destinationKey: string): RateLimitConfig {
    return this.destinationConfig.get(destinationKey) || {
      maxPerHour: 60,
      jitterMs: 1000,
    };
  }

  /**
   * Enforce rate limiting and return wait time if needed
   */
  checkRateLimit(destinationKey: string, orgId: string): number {
    const config = this.getRateLimit(destinationKey);
    return this.queueManager.checkRateLimit(destinationKey, config.maxPerHour);
  }

  /**
   * Generate deterministic idempotency key for retry safety
   */
  generateIdempotencyKey(assetId: string, destinationKey: string): string {
    const key = `${assetId}-${destinationKey}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Process queue in background
   * TODO: Replace with proper background job processor
   */
  private async processQueueInBackground(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (true) {
        // This is a simplified MVP implementation
        // In production, use a proper job queue like BullMQ
        await new Promise((resolve) => setTimeout(resolve, 100));

        const stats = this.queueManager.getStats();
        if (stats.pending === 0 && stats.processing === 0) {
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.queueManager.getStats();
  }
}

export const publishOrchestrator = new PublishOrchestrator();
