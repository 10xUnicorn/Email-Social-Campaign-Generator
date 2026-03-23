import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface SearchConsoleCredentials {
  accessToken: string;
  siteUrl: string;
}

interface SearchConsolePayload {
  sitemapUrl: string;
}

export class SearchConsoleConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'google-search-console',
      name: 'Google Search Console',
      group: 'feed',
      description: 'Submit sitemaps to Google Search Console',
      supportsCanonical: false,
      authType: 'oauth',
      rateLimit: {
        requests: 10,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 255,
        maxContentLength: 10000,
        supportedFormats: ['plaintext'],
      },
    };
    super(config);
  }

  async validate(
    asset: ContentAsset,
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!credentials.accessToken || !credentials.siteUrl) {
      this.addError(errors, 'credentials', 'Access Token and Site URL are required');
    }

    if (credentials.siteUrl) {
      try {
        new URL(credentials.siteUrl);
      } catch {
        this.addError(errors, 'siteUrl', 'Site URL must be a valid URL');
      }
    }

    if (!asset.canonicalUrl && !asset.excerpt) {
      this.addWarning(warnings, 'content', 'Sitemap URL would be helpful');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const payload: SearchConsolePayload = {
      sitemapUrl: asset.canonicalUrl || '',
    };

    return payload as unknown as MappedPayload;
  }

  private normalizeSiteUrl(siteUrl: string): string {
    try {
      const url = new URL(siteUrl);
      return `${url.protocol}//${url.hostname}/`;
    } catch {
      return siteUrl;
    }
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `gsc-${Date.now()}`,
        'https://search.google.com/search-console'
      );
    }

    try {
      const mapped = payload as SearchConsolePayload;
      const siteUrl = this.normalizeSiteUrl(credentials.siteUrl);
      const encodedSiteUrl = encodeURIComponent(siteUrl);

      const endpoint = `https://www.google.com/webmasters/tools/crawl-sitemap?resource_id=${encodedSiteUrl}`;

      const response = await this.safeFetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sitemapUrl: mapped.sitemapUrl,
        }),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `GSC_${response.status}`,
          `Search Console API error: ${response.status}`,
          response.status >= 500
        );
      }

      return this.createSuccessResult(
        mapped.sitemapUrl,
        `https://search.google.com/search-console?resource_id=${encodedSiteUrl}`,
        {
          googleSearchConsoleUrl: mapped.sitemapUrl,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit sitemap to Google Search Console';
      return this.createErrorResult('GSC_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const payload = mapped as SearchConsolePayload;

    const previewHtml = `
<div style="padding: 16px; background: #f3f3f3; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #4285f4;">Google Search Console Preview</h3>
  <div style="background: white; padding: 12px; border-radius: 4px;">
    <p><strong>Sitemap URL:</strong></p>
    <p style="word-break: break-all;">${this.escapeHtml(payload.sitemapUrl)}</p>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'google-search-console',
      mappedFields: {
        sitemapUrl: payload.sitemapUrl,
      },
      renderedPreview: previewHtml,
      warnings: [],
      suggestedEdits: [],
    };
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }
}

export default SearchConsoleConnector;
