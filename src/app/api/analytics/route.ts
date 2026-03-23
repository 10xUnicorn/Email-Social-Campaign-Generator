import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/utils/mock-db';
import { AnalyticsTracker } from '@/lib/analytics/tracker';

/**
 * GET /api/analytics
 * Get analytics data with optional filtering
 * Query params:
 * - campaignId: Get stats for specific campaign
 * - orgId: Get org-level stats
 * - type: 'campaign' | 'destination' | 'overview'
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');
    const orgId = searchParams.get('orgId');
    const type = searchParams.get('type') || 'campaign';

    const tracker = new AnalyticsTracker();

    if (campaignId) {
      // Campaign-specific analytics
      const campaign = mockDb.getCampaign(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      if (type === 'destination') {
        // Per-destination breakdown
        const destStats = tracker.getDestinationStats(campaignId);
        return NextResponse.json({
          campaignId,
          type: 'destination',
          data: destStats,
        });
      }

      // Default: campaign overview
      const stats = tracker.getCampaignStats(campaignId);
      return NextResponse.json({
        campaignId,
        type: 'campaign',
        data: stats,
      });
    }

    if (orgId) {
      // Organization-level analytics
      const campaign = mockDb.getCampaign(campaignId || '');

      // Verify orgId matches if campaignId provided
      if (campaignId && campaign && campaign.orgId !== orgId) {
        return NextResponse.json(
          { error: 'Organization ID does not match campaign' },
          { status: 403 }
        );
      }

      const stats = tracker.getOrgStats(orgId);

      // Get top destinations
      const topDestinations = tracker.getTopDestinations(orgId, 10);

      return NextResponse.json({
        orgId,
        type: 'overview',
        data: {
          summary: {
            totalCampaigns: stats.totalCampaigns,
            totalAssets: stats.totalAssets,
            totalPublished: stats.totalPublished,
            totalFailed: stats.totalFailed,
            totalClicks: stats.totalClicks,
            successRate: stats.successRate,
          },
          destinationBreakdown: stats.destinationBreakdown,
          topDestinations,
        },
      });
    }

    return NextResponse.json(
      { error: 'Missing required query parameter: campaignId or orgId' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
