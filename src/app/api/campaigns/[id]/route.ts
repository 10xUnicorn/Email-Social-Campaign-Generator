import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/utils/mock-db';
import { Campaign } from '@/types/index';

export interface CampaignDetailResponse extends Campaign {
  assets: any[];
  submissions: any[];
}

/**
 * GET /api/campaigns/[id]
 * Get a specific campaign with its assets and submissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const campaign = mockDb.getCampaign(id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const assets = mockDb.getAssetsByCampaign(id);
    const submissions = mockDb.getSubmissionsByCampaign(id);

    const response: CampaignDetailResponse = {
      ...campaign,
      assets,
      submissions,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Update campaign settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const campaign = mockDb.getCampaign(id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate updateable fields
    const allowedFields = ['status', 'utmPolicy', 'canonicalSiteUrl', 'siteBrief', 'claimsMap'];
    const updates: Partial<Campaign> = {};

    for (const field of allowedFields) {
      if (field in body) {
        (updates as any)[field] = body[field];
      }
    }

    const updated = mockDb.updateCampaign(id, updates);

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
