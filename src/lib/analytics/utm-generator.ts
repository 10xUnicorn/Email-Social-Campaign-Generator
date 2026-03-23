import { mockDb } from '@/lib/utils/mock-db';
import { AssetType } from '@/types/index';

export interface UTMParams {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
}

/**
 * UTMGenerator creates tracking URLs with UTM parameters
 * for campaigns across various destinations
 */
export class UTMGenerator {
  /**
   * Generate UTM parameters for a campaign asset distribution
   */
  generate(
    campaignId: string,
    destinationKey: string,
    assetType: AssetType
  ): UTMParams {
    // Get campaign for slug
    const campaign = mockDb.getCampaign(campaignId);
    const campaignSlug = campaign?.id?.substring(0, 8) || 'campaign';

    // Map destination key to group
    const destinationGroup = this.getDestinationGroup(destinationKey);

    return {
      utm_source: destinationKey,
      utm_medium: destinationGroup,
      utm_campaign: campaignSlug,
      utm_content: assetType,
    };
  }

  /**
   * Determine destination group from destination key
   */
  private getDestinationGroup(destinationKey: string): string {
    const groupMap: Record<string, string> = {
      // API destinations
      mastodon: 'api',
      wordpress: 'api',
      'forem-dev': 'api',
      bluesky: 'api',

      // Feed destinations
      'rss-generator': 'feed',
      indexnow: 'feed',

      // Assisted pack destinations
      'medium-pack': 'assist',
      'prlog-pack': 'assist',
      'community-packs': 'assist',
    };

    return groupMap[destinationKey] || 'other';
  }

  /**
   * Append UTM parameters to a URL
   */
  buildUrl(baseUrl: string, utmParams: UTMParams): string {
    try {
      const url = new URL(baseUrl);

      // Add UTM params
      Object.entries(utmParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      return url.toString();
    } catch (error) {
      // If URL parsing fails, append as query string
      const separator = baseUrl.includes('?') ? '&' : '?';
      const queryString = Object.entries(utmParams)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      return `${baseUrl}${separator}${queryString}`;
    }
  }

  /**
   * Generate a full tracking link with UTM parameters
   */
  generateTrackingLink(
    originalUrl: string,
    campaignId: string,
    destinationKey: string,
    assetType: AssetType
  ): string {
    const utmParams = this.generate(campaignId, destinationKey, assetType);
    return this.buildUrl(originalUrl, utmParams);
  }

  /**
   * Extract UTM parameters from a URL
   */
  extractUTMParams(url: string): Partial<UTMParams> {
    try {
      const urlObj = new URL(url);
      return {
        utm_source: urlObj.searchParams.get('utm_source') || undefined,
        utm_medium: urlObj.searchParams.get('utm_medium') || undefined,
        utm_campaign: urlObj.searchParams.get('utm_campaign') || undefined,
        utm_content: urlObj.searchParams.get('utm_content') || undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Get base URL without UTM parameters
   */
  getBaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove UTM params
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(
        (param) => urlObj.searchParams.delete(param)
      );

      return urlObj.toString();
    } catch {
      return url;
    }
  }
}

// Singleton instance
let instance: UTMGenerator | null = null;

export function getUTMGenerator(): UTMGenerator {
  if (!instance) {
    instance = new UTMGenerator();
  }
  return instance;
}
