import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  IndexNowPayload,
} from '@/types/connector';

export class IndexNowConnector extends BaseConnector {
  private readonly INDEXNOW_ENDPOINT = 'https://www.indexnow.org/indexnow';

  constructor() {
    const config: DestinationConfig = {
      key: 'indexnow',
      name: 'IndexNow',
      group: 'feed',
      description: 'Submit URLs to search engines via IndexNow protocol',
      supportsCanonical: false,
      authType: 'none',
      rateLimit: {
        requests: 1000,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxContentLength: 1000000,
        supportedFormats: ['url-list'],
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

    // Validate credentials
    if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
      this.addError(errors, 'apiKey', 'IndexNow API key is required');
    }

    if (!credentials.host || typeof credentials.host !== 'string') {
      this.addError(
        errors,
        'host',
        'Domain/host is required (e.g., example.com)'
      );
    } else if (!this.isValidHost(credentials.host)) {
      this.addError(errors, 'host', 'Invalid domain format');
    }

    // Validate canonical URL
    if (!asset.canonicalUrl) {
      this.addWarning(
        warnings,
        'canonicalUrl',
        'Canonical URL is recommended for IndexNow submission'
      );
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
    // For IndexNow, we collect URLs that have been newly published or changed
    const urlList: string[] = [];

    // Add canonical URL if available
    if (asset.canonicalUrl) {
      urlList.push(asset.canonicalUrl);
    }

    // IndexNow can accept up to 10,000 URLs per request
    // In this case, we're just submitting the main content URL
    const payload: IndexNowPayload = {
      host: '', // Will be populated from credentials
      key: '', // Will be populated from credentials
      keyLocation: '', // Will be populated from credentials
      urlList,
    };

    return payload as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `indexnow-${Date.now()}`,
        undefined,
        {
          urlsSubmitted: (payload as IndexNowPayload).urlList.length,
        }
      );
    }

    // Check rate limit
    if (!this.enforceRateLimit(credentials.host)) {
      return this.createErrorResult(
        'RATE_LIMIT_EXCEEDED',
        'IndexNow API rate limit exceeded',
        true
      );
    }

    try {
      const indexNowPayload = payload as IndexNowPayload;

      // Populate credentials into payload
      indexNowPayload.host = credentials.host;
      indexNowPayload.key = credentials.apiKey;
      indexNowPayload.keyLocation = credentials.keyLocation ||
        `https://${credentials.host}/indexnow.txt`;

      // Validate URL list
      if (!indexNowPayload.urlList || indexNowPayload.urlList.length === 0) {
        return this.createErrorResult(
          'INVALID_PAYLOAD',
          'No URLs to submit',
          false
        );
      }

      // IndexNow accepts max 10,000 URLs per request
      if (indexNowPayload.urlList.length > 10000) {
        return this.createErrorResult(
          'PAYLOAD_TOO_LARGE',
          'IndexNow accepts maximum 10,000 URLs per request',
          false
        );
      }

      const response = await this.safeFetch(this.INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MassDistributionPlatform/1.0',
        },
        body: JSON.stringify(indexNowPayload),
      });

      if (!response.ok) {
        let errorMessage = `IndexNow returned ${response.status}`;
        let errorDetails: Record<string, any> = {};

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          errorDetails = errorData;
        } catch {
          // Use default message
        }

        return this.createErrorResult(
          `INDEXNOW_${response.status}`,
          errorMessage,
          response.status >= 500,
          errorDetails
        );
      }

      // IndexNow returns 202 Accepted for successful submissions
      return this.createSuccessResult(
        `indexnow-${Date.now()}`,
        undefined,
        {
          host: credentials.host,
          urlsSubmitted: indexNowPayload.urlList.length,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(
        'INDEXNOW_ERROR',
        `Failed to submit to IndexNow: ${message}`,
        true,
        { originalError: String(error) }
      );
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const urls = asset.canonicalUrl ? [asset.canonicalUrl] : [];

    const previewHtml = `
<div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px;">
  <div style="font-weight: bold; margin-bottom: 8px;">IndexNow URL Submission</div>
  <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
    <div style="font-size: 0.9em; color: #666;">URLs to be submitted:</div>
    ${urls.length > 0 ? `<div style="font-family: monospace; font-size: 0.85em;">${urls.map((url) => this.escapeHtml(url)).join('<br>')}</div>` : '<div style="color: #999; font-style: italic;">No URLs to submit</div>'}
  </div>
  <div style="font-size: 0.85em; color: #666;">
    <div>Purpose: Notify search engines of new/updated content</div>
    <div>Protocol: IndexNow (supports Bing, Yandex, and more)</div>
  </div>
</div>
    `.trim();

    const warnings = [];
    if (!asset.canonicalUrl) {
      warnings.push({
        type: 'optimization' as const,
        message: 'No canonical URL available. Ensure asset has canonicalUrl set.',
        affectedField: 'canonicalUrl',
      });
    }

    return {
      destinationKey: 'indexnow',
      mappedFields: {
        host: '',
        urls: urls.join(', ') || 'None',
        urlCount: String(urls.length),
      },
      renderedPreview: previewHtml,
      warnings,
      suggestedEdits: [],
    };
  }

  private isValidHost(host: string): boolean {
    // Basic domain validation
    const domainRegex = /^([a-z0-9]([a-z0-9\-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
    return domainRegex.test(host);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
