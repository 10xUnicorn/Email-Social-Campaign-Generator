import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/utils/mock-db';
import { Campaign, ContentAsset } from '@/types/index';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCampaignRequest {
  orgId: string;
  sourceUrl?: string;
  canonicalSiteUrl?: string;
  utmPolicy?: string;
}

export interface CampaignResponse extends Campaign {
  assetCount?: number;
  submissionCount?: number;
}

/**
 * GET /api/campaigns
 * List all campaigns for an organization
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: orgId' },
        { status: 400 }
      );
    }

    const campaigns = mockDb.listCampaigns(orgId);

    // Enrich with counts
    const enriched: CampaignResponse[] = campaigns.map((campaign) => {
      const assets = mockDb.getAssetsByCampaign(campaign.id);
      const submissions = mockDb.getSubmissionsByCampaign(campaign.id);

      return {
        ...campaign,
        assetCount: assets.length,
        submissionCount: submissions.length,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateCampaignRequest = await request.json();

    if (!body.orgId) {
      return NextResponse.json(
        { error: 'Missing required field: orgId' },
        { status: 400 }
      );
    }

    if (body.sourceUrl) {
      try {
        new URL(body.sourceUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid sourceUrl format' },
          { status: 400 }
        );
      }
    }

    const campaign = mockDb.createCampaign({
      orgId: body.orgId,
      sourceUrl: body.sourceUrl,
      sourceType: 'manual',
      canonicalSiteUrl: body.canonicalSiteUrl,
      utmPolicy: body.utmPolicy || 'utm_only',
      status: 'draft',
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
