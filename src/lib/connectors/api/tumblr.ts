import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface TumblrCredentials {
  accessToken: string;
  blogName: string;
}

interface TumblrNPFPost {
  content: Array<{
    type: 'text' | 'image' | 'video';
    text?: string;
    url?: string;
    media?: Array<{
      type: 'image' | 'video';
      url: string;
    }>;
  }>;
  layout?: Array<{
    type: 'rows';
    display: Array<{
      blocks: number[];
    }>;
  }>;
  publish_on?: string;
  state?: 'published' | 'draft' | 'queue' | 'private';
}

export class TumblrConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'tumblr',
      name: 'Tumblr',
      group: 'api',
      description: 'Post content to Tumblr blogs using NPF format',
      supportsCanonical: false,
      authType: 'oauth',
      rateLimit: {
        requests: 10,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 500,
        maxContentLength: 10000,
        supportedFormats: ['plaintext', 'html'],
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

    if (!credentials.accessToken) {
      this.addError(errors, 'credentials', 'Access Token is required');
    }

    if (!credentials.blogName) {
      this.addError(errors, 'credentials', 'Blog Name is required');
    }

    if (credentials.blogName && (credentials.blogName.includes('@') || credentials.blogName.includes('/'))) {
      this.addError(errors, 'blogName', 'Blog name should not include @ or /');
    }

    if (!asset.title && !asset.excerpt) {
      this.addError(errors, 'content', 'Title or content is required');
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
    const text = asset.title || '';
    const htmlContent = asset.bodyMarkdown || asset.excerpt || '';

    const contentBlocks: TumblrNPFPost['content'] = [];

    if (text) {
      contentBlocks.push({
        type: 'text',
        text: htmlContent || text,
      });
    }

    const post: TumblrNPFPost = {
      content: contentBlocks,
      state: 'published',
    };

    return post as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `tumblr-${Date.now()}`,
        `https://${credentials.blogName}.tumblr.com/post/${Date.now()}`
      );
    }

    try {
      const post = payload as TumblrNPFPost;
      const blogId = credentials.blogName.includes('.') ? credentials.blogName : `${credentials.blogName}.tumblr.com`;
      const endpoint = `https://api.tumblr.com/v2/blog/${blogId}/posts`;

      const response = await this.safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
        },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `TUMBLR_${response.status}`,
          `Tumblr API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();
      const postId = result.response?.id;
      const postUrl = `https://${blogId}/post/${postId}`;

      return this.createSuccessResult(postId, postUrl, {
        tumblrPostId: postId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to Tumblr';
      return this.createErrorResult('TUMBLR_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const post = mapped as TumblrNPFPost;

    const contentText = post.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    const previewHtml = `
<div style="padding: 16px; background: #f3f3f3; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #2c3e50;">Tumblr Post Preview</h3>
  <div style="background: white; padding: 12px; border-radius: 4px;">
    <div style="white-space: pre-wrap; word-wrap: break-word; color: #333;">
      ${this.escapeHtml(contentText)}
    </div>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'tumblr',
      mappedFields: {
        content: contentText.substring(0, 100),
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

export default TumblrConnector;
