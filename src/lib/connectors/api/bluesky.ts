import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  BlueskyPost,
  BlueskyFacet,
} from '@/types/connector';

interface BlueskySession {
  handle: string;
  did: string;
  accessJwt: string;
  refreshJwt: string;
}

export class BlueskyConnector extends BaseConnector {
  private readonly ATP_ENDPOINT = 'https://bsky.social/xrpc';

  constructor() {
    const config: DestinationConfig = {
      key: 'bluesky',
      name: 'Bluesky',
      group: 'api',
      description: 'Post content to Bluesky via AT Protocol',
      supportsCanonical: false,
      authType: 'basic',
      rateLimit: {
        requests: 300,
        periodSeconds: 900,
      },
      contentLimits: {
        maxContentLength: 300,
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
    if (!credentials.handle || typeof credentials.handle !== 'string') {
      this.addError(errors, 'handle', 'Bluesky handle is required (e.g., user.bsky.social)');
    }

    if (!credentials.appPassword || typeof credentials.appPassword !== 'string') {
      this.addError(errors, 'appPassword', 'Bluesky app password is required');
    }

    // Validate asset
    if (!asset.title && !asset.excerpt && !asset.bodyMarkdown) {
      this.addError(errors, 'content', 'Title, excerpt, or content is required');
    }

    // Check content length
    const statusText = this.buildStatusText(asset);
    if (statusText.length > 300) {
      this.addWarning(
        warnings,
        'content',
        `Post is ${statusText.length} characters. Bluesky limit is 300. Content will be truncated.`
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
    const statusText = this.buildStatusText(asset);
    const truncatedStatus = this.truncateText(statusText, 300);

    // Extract URLs for rich text facets
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatches = Array.from(truncatedStatus.matchAll(urlRegex));

    const facets: BlueskyFacet[] = [];
    for (const match of urlMatches) {
      const url = match[0];
      const startIndex = match.index!;
      const endIndex = startIndex + url.length;

      // Convert character indices to byte indices (UTF-8)
      const byteStart = Buffer.byteLength(truncatedStatus.substring(0, startIndex));
      const byteEnd = byteStart + Buffer.byteLength(url);

      facets.push({
        index: {
          byteStart,
          byteEnd,
        },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: url,
          },
        ],
      });
    }

    const post: BlueskyPost = {
      $type: 'app.bsky.feed.post',
      text: truncatedStatus,
      createdAt: new Date().toISOString(),
      facets: facets.length > 0 ? facets : undefined,
    };

    return post as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `bsky-${Date.now()}`,
        `https://bsky.app/profile/${credentials.handle}/post/${Date.now()}`
      );
    }

    // Check rate limit
    if (!this.enforceRateLimit(credentials.handle)) {
      return this.createErrorResult(
        'RATE_LIMIT_EXCEEDED',
        'Bluesky API rate limit exceeded',
        true
      );
    }

    try {
      // Create session
      const session = await this.createSession(credentials);
      if (!session) {
        return this.createErrorResult(
          'AUTH_FAILED',
          'Failed to authenticate with Bluesky',
          false
        );
      }

      // Create the post record
      const postPayload = payload as BlueskyPost;
      const response = await this.safeFetch(
        `${this.ATP_ENDPOINT}/com.atproto.repo.createRecord`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessJwt}`,
            'User-Agent': 'MassDistributionPlatform/1.0',
          },
          body: JSON.stringify({
            repo: session.did,
            collection: 'app.bsky.feed.post',
            record: postPayload,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Bluesky API returned ${response.status}`;
        let errorDetails: Record<string, any> = {};

        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
          errorDetails = errorData;
        } catch {
          // Use default message
        }

        return this.createErrorResult(
          `BLUESKY_${response.status}`,
          errorMessage,
          response.status >= 500,
          errorDetails
        );
      }

      const recordData = await response.json();

      // Construct post URL
      const postUrl = `https://bsky.app/profile/${session.handle}/post/${recordData.uri.split('/').pop()}`;

      return this.createSuccessResult(
        recordData.uri,
        postUrl,
        {
          blueskyUri: recordData.uri,
          cid: recordData.cid,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(
        'BLUESKY_ERROR',
        `Failed to publish to Bluesky: ${message}`,
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
    const truncatedStatus = this.truncateText(statusText, 300);

    const previewHtml = `
<div style="border: 1px solid #1185fe; padding: 16px; border-radius: 12px; max-width: 500px; font-family: system-ui;">
  <div style="font-size: 0.9em; color: #536471; margin-bottom: 8px;">Post to Bluesky</div>
  <div style="white-space: pre-wrap; word-wrap: break-word; font-size: 1em; line-height: 1.5;">
${this.escapeHtml(truncatedStatus)}
  </div>
  <div style="font-size: 0.85em; color: #536471; margin-top: 12px;">
    ${truncatedStatus.length} / 300 characters
  </div>
</div>
    `.trim();

    const warnings = [];
    if (statusText.length > 300) {
      warnings.push({
        type: 'compliance' as const,
        message: `Post exceeds 300 character limit by ${statusText.length - 300} characters and will be truncated`,
        affectedField: 'text',
      });
    }

    const suggestedEdits = [];
    if (asset.canonicalUrl && truncatedStatus.length + 1 < 300) {
      suggestedEdits.push({
        field: 'text',
        currentValue: truncatedStatus,
        suggestedValue: truncatedStatus + '\n' + asset.canonicalUrl,
        reason: 'Consider including the canonical URL',
      });
    }

    return {
      destinationKey: 'bluesky',
      mappedFields: {
        text: truncatedStatus,
        characterCount: `${truncatedStatus.length} / 300`,
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
      if (text) text += ' ';
      text += asset.excerpt;
    } else if (asset.bodyMarkdown) {
      if (text) text += ' ';
      const plainText = this.markdownToPlainText(asset.bodyMarkdown);
      const preview = plainText.substring(0, 100);
      text += preview;
      if (plainText.length > 100) {
        text += '...';
      }
    }

    // Add canonical URL if available
    if (asset.canonicalUrl && text.length < 280) {
      if (text) text += ' ';
      text += asset.canonicalUrl;
    }

    return text;
  }

  private async createSession(
    credentials: Record<string, any>
  ): Promise<BlueskySession | null> {
    try {
      const response = await this.safeFetch(
        `${this.ATP_ENDPOINT}/com.atproto.server.createSession`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MassDistributionPlatform/1.0',
          },
          body: JSON.stringify({
            identifier: credentials.handle,
            password: credentials.appPassword,
          }),
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
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
