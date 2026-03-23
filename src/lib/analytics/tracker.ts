import { mockDb } from '@/lib/utils/mock-db';

export interface PublishEvent {
  submissionId: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'skipped';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CampaignStats {
  campaignId: string;
  totalAssets: number;
  totalDestinations: number;
  totalPublished: number;
  totalFailed: number;
  successRate: number;
  totalClicks: number;
  publishEvents: PublishEvent[];
}

export interface DestinationStats {
  destinationKey: string;
  successCount: number;
  failureCount: number;
  totalAttempts: number;
  successRate: number;
  avgAttempts: number;
}

export interface OrgStats {
  orgId: string;
  totalCampaigns: number;
  totalAssets: number;
  totalPublished: number;
  totalFailed: number;
  totalClicks: number;
  successRate: number;
  destinationBreakdown: Record<string, DestinationStats>;
}

/**
 * AnalyticsTracker records and aggregates analytics events
 * Tracks publication events and generates campaign/org-level analytics
 */
export class AnalyticsTracker {
  private events: Map<string, PublishEvent[]> = new Map(); // By submission ID

  /**
   * Record a click on a tracking link
   */
  recordClick(trackingLinkId: string): void {
    const link = mockDb.getTrackingLink(trackingLinkId);
    if (link) {
      mockDb.updateTrackingLink(trackingLinkId, {
        clicks: (link.clicks || 0) + 1,
      });
    }
  }

  /**
   * Record a publish event
   */
  recordPublishEvent(
    submissionId: string,
    status: PublishEvent['status'],
    metadata?: Record<string, any>
  ): void {
    const event: PublishEvent = {
      submissionId,
      status,
      timestamp: new Date(),
      metadata,
    };

    if (!this.events.has(submissionId)) {
      this.events.set(submissionId, []);
    }

    this.events.get(submissionId)!.push(event);
  }

  /**
   * Get analytics for a specific campaign
   */
  getCampaignStats(campaignId: string): CampaignStats {
    const campaign = mockDb.getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const submissions = mockDb.getSubmissionsByCampaign(campaignId);
    const trackingLinks = mockDb.getTrackingLinksByCampaign(campaignId);

    let published = 0;
    let failed = 0;

    for (const submission of submissions) {
      if (submission.status === 'sent') published++;
      else if (submission.status === 'failed') failed++;
    }

    const totalClicks = trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const successRate =
      submissions.length > 0 ? (published / submissions.length) * 100 : 0;

    return {
      campaignId,
      totalAssets: new Set(submissions.map((s) => s.assetId)).size,
      totalDestinations: new Set(submissions.map((s) => s.destinationId)).size,
      totalPublished: published,
      totalFailed: failed,
      successRate: Math.round(successRate * 100) / 100,
      totalClicks,
      publishEvents: this.getEventsForCampaign(campaignId),
    };
  }

  /**
   * Get analytics broken down by destination for a campaign
   */
  getDestinationStats(campaignId: string): DestinationStats[] {
    const submissions = mockDb.getSubmissionsByCampaign(campaignId);
    const statsMap = new Map<string, DestinationStats>();

    for (const submission of submissions) {
      const destKey = submission.destinationId;
      if (!statsMap.has(destKey)) {
        statsMap.set(destKey, {
          destinationKey: destKey,
          successCount: 0,
          failureCount: 0,
          totalAttempts: 0,
          successRate: 0,
          avgAttempts: 0,
        });
      }

      const stats = statsMap.get(destKey)!;
      if (submission.status === 'sent') {
        stats.successCount++;
      } else if (submission.status === 'failed') {
        stats.failureCount++;
      }
      stats.totalAttempts += submission.attempts;
    }

    // Calculate rates and averages
    for (const stats of statsMap.values()) {
      const total = stats.successCount + stats.failureCount;
      stats.successRate = total > 0 ? (stats.successCount / total) * 100 : 0;
      stats.avgAttempts = total > 0 ? stats.totalAttempts / total : 0;
    }

    return Array.from(statsMap.values());
  }

  /**
   * Get organization-level statistics
   */
  getOrgStats(orgId: string): OrgStats {
    const campaigns = mockDb.listCampaigns(orgId);
    const submissions = campaigns.flatMap((c) => mockDb.getSubmissionsByCampaign(c.id));
    const trackingLinks = campaigns.flatMap((c) => mockDb.getTrackingLinksByCampaign(c.id));

    let totalPublished = 0;
    let totalFailed = 0;
    const destinationMap = new Map<string, DestinationStats>();

    for (const submission of submissions) {
      const destKey = submission.destinationId;

      // Track destination stats
      if (!destinationMap.has(destKey)) {
        destinationMap.set(destKey, {
          destinationKey: destKey,
          successCount: 0,
          failureCount: 0,
          totalAttempts: 0,
          successRate: 0,
          avgAttempts: 0,
        });
      }

      const destStats = destinationMap.get(destKey)!;
      if (submission.status === 'sent') {
        totalPublished++;
        destStats.successCount++;
      } else if (submission.status === 'failed') {
        totalFailed++;
        destStats.failureCount++;
      }
      destStats.totalAttempts += submission.attempts;
    }

    // Calculate rates
    const destinationBreakdown: Record<string, DestinationStats> = {};
    for (const [key, stats] of destinationMap.entries()) {
      const total = stats.successCount + stats.failureCount;
      stats.successRate = total > 0 ? (stats.successCount / total) * 100 : 0;
      stats.avgAttempts = total > 0 ? stats.totalAttempts / total : 0;
      destinationBreakdown[key] = stats;
    }

    const totalClicks = trackingLinks.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const successRate =
      submissions.length > 0 ? (totalPublished / submissions.length) * 100 : 0;

    return {
      orgId,
      totalCampaigns: campaigns.length,
      totalAssets: new Set(submissions.map((s) => s.assetId)).size,
      totalPublished,
      totalFailed,
      totalClicks,
      successRate: Math.round(successRate * 100) / 100,
      destinationBreakdown,
    };
  }

  /**
   * Get all events for a campaign
   */
  private getEventsForCampaign(campaignId: string): PublishEvent[] {
    const result: PublishEvent[] = [];

    for (const events of this.events.values()) {
      result.push(...events);
    }

    // Filter by campaign - would need submission lookup
    // For MVP, just return all events
    return result;
  }

  /**
   * Get top destinations by submission count
   */
  getTopDestinations(
    orgId: string,
    limit: number = 10
  ): Array<{ destination: string; count: number; successRate: number }> {
    const campaigns = mockDb.listCampaigns(orgId);
    const submissions = campaigns.flatMap((c) => mockDb.getSubmissionsByCampaign(c.id));

    const destMap = new Map<string, { count: number; successful: number }>();

    for (const submission of submissions) {
      if (!destMap.has(submission.destinationId)) {
        destMap.set(submission.destinationId, { count: 0, successful: 0 });
      }

      const stats = destMap.get(submission.destinationId)!;
      stats.count++;
      if (submission.status === 'sent') {
        stats.successful++;
      }
    }

    return Array.from(destMap.entries())
      .map(([destination, { count, successful }]) => ({
        destination,
        count,
        successRate: (successful / count) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear all tracked events (for testing)
   */
  clear(): void {
    this.events.clear();
  }
}

// Singleton instance
let instance: AnalyticsTracker | null = null;

export function getAnalyticsTracker(): AnalyticsTracker {
  if (!instance) {
    instance = new AnalyticsTracker();
  }
  return instance;
}
