import crypto from 'crypto';
import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface GhostCredentials {
  adminKey: string;
  apiUrl: string;
}

interface GhostPost {
  posts: Array<{
    title: string;
    html: string;
    status: 'published' | 'draft';
    tags?: Array<{ name: string }>;
    excerpt?: string;
  }>;
}

export class GhostConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'ghost',
      name: 'Ghost',
      group: 'api',
      description: 'Publish content to Ghost blogs via Admin API',
      supportsCanonical: true,
      authType: 'apikey',
      rateLimit: {
        requests: 10,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 255,
        maxContentLength: 100000,
        supportedFormats: ['html', 'markdown'],
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

    if (!credentials.adminKey || !credentials.apiUrl) {
      this.addError(errors, 'credentials', 'Admin Key and API URL are required');
    }

    if (credentials.apiUrl && !credentials.apiUrl.startsWith('http')) {
      this.addError(errors, 'apiUrl', 'API URL must start with http or https');
    }

    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Article title is required');
    }

    if (!asset.bodyMarkdown && !asset.excerpt) {
      this.addError(errors, 'content', 'Article content is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private generateJWT(adminKey: string): string {
    const [id, secret] = adminKey.split(':');

    if (!id || !secret) {
      throw new Error('Invalid Ghost admin key format. Expected: id:secret');
    }

    const header = {
      alg: 'HS256',
      typ: 'JWT',
      kid: id,
    };

    const payload = {
      iss: id,
      sub: 'Admin API',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minutes
    };

    const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;

    const signature = crypto
      .createHmac('sha256', Buffer.from(secret, 'hex'))
      .update(signatureInput)
      .digest('base64url');

    return `${signatureInput}.${signature}`;
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const html = asset.bodyMarkdown || asset.excerpt || '';

    const post: GhostPost = {
      posts: [
        {
          title: asset.title,
          html,
          status: 'draft',
          excerpt: asset.excerpt,
          tags: asset.tags ? asset.tags.map(tag => ({ name: tag })) : [],
        },
      ],
    };

    return post as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `ghost-${Date.now()}`,
        `${credentials.apiUrl}/?p=${Date.now()}`
      );
    }

    try {
      const post = payload as GhostPost;
      const token = this.generateJWT(credentials.adminKey);

      const apiUrl = credentials.apiUrl.replace(/\/$/, '');
      const endpoint = `${apiUrl}/ghost/api/admin/posts`;

      const response = await this.safeFetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Ghost ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return this.createErrorResult(
          `GHOST_${response.status}`,
          `Ghost API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();
      const postId = result.posts?.[0]?.id;
      const postUrl = result.posts?.[0]?.url;

      return this.createSuccessResult(postId, postUrl, {
        ghostPostId: postId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to Ghost';
      return this.createErrorResult('GHOST_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const post = mapped as GhostPost;

    const previewHtml = `
<article>
  <h1>${this.escapeHtml(post.posts[0].title)}</h1>
  <div class="content">
    ${this.escapeHtml(post.posts[0].html)}
  </div>
  ${post.posts[0].excerpt ? `<p><em>${this.escapeHtml(post.posts[0].excerpt)}</em></p>` : ''}
</article>
    `.trim();

    return {
      destinationKey: 'ghost',
      mappedFields: {
        title: post.posts[0].title,
        status: post.posts[0].status,
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

export default GhostConnector;
