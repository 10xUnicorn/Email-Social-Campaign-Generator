import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface BloggerCredentials {
  accessToken: string;
  blogId: string;
}

interface BloggerPost {
  kind: 'blogger#post';
  title: string;
  content: string;
  labels?: string[];
}

export class BloggerConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'blogger',
      name: 'Blogger',
      group: 'api',
      description: 'Publish content to Blogger blogs via Google API',
      supportsCanonical: true,
      authType: 'oauth',
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

    if (!credentials.accessToken || !credentials.blogId) {
      this.addError(errors, 'credentials', 'Access Token and Blog ID are required');
    }

    if (credentials.blogId && credentials.blogId.length < 1) {
      this.addError(errors, 'blogId', 'Blog ID must be a valid number');
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

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const post: BloggerPost = {
      kind: 'blogger#post',
      title: asset.title,
      content: asset.bodyMarkdown || asset.excerpt || '',
      labels: asset.tags || [],
    };

    return post as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `blogger-${Date.now()}`,
        `https://blogger.com/post/${Date.now()}`
      );
    }

    try {
      const post = payload as BloggerPost;
      const endpoint = `https://www.googleapis.com/blogger/v3/blogs/${credentials.blogId}/posts`;

      const response = await this.safeFetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          labels: post.labels,
        }),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `BLOGGER_${response.status}`,
          `Blogger API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();

      return this.createSuccessResult(result.id, result.url, {
        bloggerPostId: result.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to Blogger';
      return this.createErrorResult('BLOGGER_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const post = mapped as BloggerPost;

    const previewHtml = `
<article>
  <h1>${this.escapeHtml(post.title)}</h1>
  <div class="labels">${(post.labels || []).map(label => `#${label}`).join(' ')}</div>
  <div class="content">
    ${this.escapeHtml(post.content)}
  </div>
</article>
    `.trim();

    return {
      destinationKey: 'blogger',
      mappedFields: {
        title: post.title,
        labels: (post.labels || []).join(', '),
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

export default BloggerConnector;
