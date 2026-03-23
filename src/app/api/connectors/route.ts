import { NextRequest, NextResponse } from 'next/server';
import { ConnectorRegistry } from '@/lib/connectors/registry';

export interface ConnectorInfo {
  key: string;
  name: string;
  group: 'api' | 'feed' | 'assist';
  description: string;
  supportsCanonical: boolean;
  authType: 'oauth' | 'apikey' | 'basic' | 'none';
  rateLimit?: {
    requests: number;
    periodSeconds: number;
  };
  contentLimits?: {
    maxTitleLength?: number;
    maxContentLength?: number;
    maxTagsCount?: number;
  };
}

/**
 * GET /api/connectors
 * List all available connectors with their configurations
 * Optional query params:
 * - group: Filter by group (api, feed, assist)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const group = searchParams.get('group') as 'api' | 'feed' | 'assist' | null;

    const registry = new ConnectorRegistry();
    const allDestinations = registry.getAllDestinations();

    // Filter by group if specified
    let destinations = allDestinations;
    if (group) {
      destinations = allDestinations.filter((d: any) => d.group === group);
    }

    // Transform to response format
    const connectors: ConnectorInfo[] = destinations.map((dest: any) => {
      const config = registry.getDestinationConfig(dest.key);

      return {
        key: dest.key,
        name: dest.name,
        group: dest.group,
        description: dest.description,
        supportsCanonical: dest.supportsCanonical,
        authType: dest.authType,
        rateLimit: config?.rateLimit,
        contentLimits: config?.contentLimits,
      };
    });

    return NextResponse.json({
      total: connectors.length,
      items: connectors,
      groups: {
        api: connectors.filter((c) => c.group === 'api').length,
        feed: connectors.filter((c) => c.group === 'feed').length,
        assist: connectors.filter((c) => c.group === 'assist').length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
