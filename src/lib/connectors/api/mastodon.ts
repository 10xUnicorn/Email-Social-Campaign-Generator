import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  MastodonStatus,
} from '@/types/connector';

export class MastodonConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'mastodon',
      name: 'Mastodon',
      group: 'api',
      description: 'Share content on Mastodon fediverse',
      supportsCanonical: false,
      authType: 'oauth',
      rateLimit: {
        requests: 300,
        periodSeconds: 900, // 5 min rate limit per Mastodon defaults
      },
      contentLimits: {
        maxContentLength: 500,
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

    // Validate credentials
    if (!credentials.accessToken || typeof credentials.accessToken !== 'string') {
      this.addError(
        errors,
        'accessToken',
        'Mastodon access token is required'
      );
    }

    if (!credentials.instanceUrl || typeof credentials.instanceUrl !== 'string') {
      this.addError(
        errors,
        'instanceUrl',
        'Mastodon instance URL is required (e.g., https://mastodon.social)'
      );
    } else if (!this.isValidUrl(credentials.instanceUrl)) {
      this.addError(errors, 'instanceUrl', 'Invalid Mastodon instance URL');
    }

    // Validate asset
    if (!asset.title && !asset.bodyMarkdown) {
      this.addError(errors, 'content', 'Title or content is required');
    }

    // Create status text for validation
    const statusText = this.buildStatusText(asset);
    if (statusText.length > 500) {
      this.addWarning(
        warnings,
        'content',
        `Status is ${statusText.length} characters. Mastodon limit is 500. Content will be truncated.`
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
    const status = this.buildStatusText(asset);
    const truncatedStatus = this.truncateText(status, 500);

    const mastodonStatus: MastodonStatus = {
      status: truncatedStatus,
      visibility: 'public',
    };

    return mastodonStatus as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `masto-${Date.now()}`,
        `${credentials.instanceUrl}/status/${Date.now()}`
      );
    }

    // Check rate limit (300 requests per 900 seconds)
    if (!this.enforceRateLimit(credentials.instanceUrl)) {
      return this.createErrorResult(
        'RATE_LIMIT_EXCEEDED',
        'Mastodon API rate limit exceeded. Please try again later.',
        true
      );
    }

    try {
      const instanceUrl = credentials.instanceUrl.replace(/\/$/, '');
      const apiUrl = `${instanceUrl}/api/v1/statuses`;

      const response = await this.safeFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'User-Agent': 'MassDistributionPlatform/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `Mastodon API returned ${response.status}`;
        let errorDetails: Record<string, any> = {};

        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          errorDetails = errorData;
        } catch {
          // Use default message
        }

        return this.createErrorResult(
          `MASTODON_${response.status}`,
          errorMessage,
          response.status >= 500,
          errorDetails
        );
      }

      const statusData = await response.json();

      return this.createSuccessResult(
        statusData.id,
        statusData.url,
        {
          mastodonStatusId: statusData.id,
          createdAt: statusData.created_at,
          accountHandle: statusData.account?.acct,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(
        'MASTODON_ERROR',
        `Failed to publish to Mastodon: ${message}`,
        true,
        { originalError: String(error) }
      );
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const statusText = this.buildStatusText(asset);
    const truncatedStatus = this.truncateText(statusText, 500);

    const previewHtml = `
<div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; max-width: 500px;">
  <div style="font-weight: bold; margin-bottom: 8px;">Mastodon Post Preview</div>
  <div style="white-space: pre-wrap; word-wrap: break-word; font-family: system-ui, -apple-system;">
${this.escapeHtml(truncatedStatus)}
  </div>
  <div style="font-size: 0.85em; color: #666; margin-top: 8px;">
    Character count: ${truncatedStatus.length} / 500
  </div>
</div>
    `.trim();

    const warnings = [];
    if (statusText.length > 500) {
      warnings.push({
        type: 'compliance' as const,
        message: `Status exceeds 500 character limit by ${statusText.length - 500} characters and will be truncated`,
        affectedField: 'status',
      });
    }

    const suggestedEdits = [];
    if (asset.canonicalUrl) {
      const urlLength = asset.canonicalUrl.length;
      if (truncatedStatus.length + urlLength > 500) {
        suggestedEdits.push({
          field: 'content',
          currentValue: truncatedStatus,
          suggestedValue: truncatedStatus + '\n\n' + asset.canonicalUrl,
          reason: 'Consider including the canonical URL',
        });
      }
    }

    return {
      destinationKey: 'mastodon',
      mappedFields: {
        status: truncatedStatus,
        visibility: 'public',
        characterCount: `${truncatedStatus.length} / 500`,
      },
      renderedPreview: previewHtml,
      warnings,
      suggestedEdits,
    };
  }

  private buildStatusText(asset: ContentAsset): string {
    let text = '';

    if (asset.title) {
      text += asset.title;
    }

    if (asset.excerpt) {
      if (text) text += '\n\n';
      text += asset.excerpt;
    } else if (asset.bodyMarkdown) {
      if (text) text += '\n\n';
      const plainText = this.markdownToPlainText(asset.bodyMarkdown);
      text += plainText.substring(0, 250);
      if (plainText.length > 250) {
        text += '...';
      }
    }

    // Add canonical URL if available
    if (asset.canonicalUrl) {
      if (text) text += '\n\n';
      text += asset.canonicalUrl;
    }

    return text;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://');
    } catch {
      return false;
    }
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
