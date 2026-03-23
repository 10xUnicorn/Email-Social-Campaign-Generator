import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/utils/mock-db';
import { publishOrchestrator } from '@/lib/orchestrator';

export interface PublishRequest {
  mode: 'dry_run' | 'live';
  orgId: string;
}

export interface PublishResponse {
  runId: string;
  campaignId: string;
  mode: string;
  status: string;
  createdAt: string;
  jobCount: number;
}

/**
 * POST /api/campaigns/[id]/publish
 * Start a publish run for a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: campaignId } = await params;
    const body: PublishRequest = await request.json();

    // Validate required fields
    if (!body.mode || !body.orgId) {
      return NextResponse.json(
        { error: 'Missing required fields: mode, orgId' },
        { status: 400 }
      );
    }

    if (body.mode !== 'dry_run' && body.mode !== 'live') {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "dry_run" or "live"' },
        { status: 400 }
      );
    }

    // Verify campaign exists
    const campaign = mockDb.getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify orgId matches
    if (campaign.orgId !== body.orgId) {
      return NextResponse.json(
        { error: 'Organization ID does not match campaign' },
        { status: 403 }
      );
    }

    // Get assets count
    const assets = mockDb.getAssetsByCampaign(campaignId);
    if (assets.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no assets to publish' },
        { status: 400 }
      );
    }

    // Start publish run
    const run = await publishOrchestrator.startRun(campaignId, body.mode, body.orgId);

    // Get job count
    const stats = publishOrchestrator.getQueueStats();
    const jobCount = stats.pending + stats.processing;

    const response: PublishResponse = {
      runId: run.id,
      campaignId: run.campaignId,
      mode: run.mode,
      status: run.status,
      createdAt: run.startedAt.toISOString(),
      jobCount,
    };

    return NextResponse.json(response, { status: 202 }); // 202 Accepted - processing async
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/[id]/publish
 * Get publish run status for a campaign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: campaignId } = await params;
    const runId = request.nextUrl.searchParams.get('runId');

    const campaign = mockDb.getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (runId) {
      // Get specific run
      const run = mockDb.getRun(runId);
      if (!run || run.campaignId !== campaignId) {
        return NextResponse.json(
          { error: 'Run not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: run.id,
        campaignId: run.campaignId,
        mode: run.mode,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString(),
        summary: run.summary,
      });
    }

    // Get all runs for campaign
    const runs = mockDb.getRunsByCampaign(campaignId);

    return NextResponse.json(
      runs.map((run) => ({
        id: run.id,
        mode: run.mode,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString(),
        summary: run.summary,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
