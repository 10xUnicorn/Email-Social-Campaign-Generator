import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  WordPressPost,
} from '@/types/connector';

export class WordPressConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'wordpress',
      name: 'WordPress Site',
      group: 'api',
      description: 'Post to your WordPress site via REST API',
      supportsCanonical: true,
      authType: 'basic',
      rateLimit: {
        requests: 20,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 255,
        maxContentLength: 100000,
        maxTagsCount: 50,
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

    // Validate credentials
    if (!credentials.siteUrl) {
      this.addError(errors, 'siteUrl', 'WordPress site URL is required');
    } else if (!this.isValidUrl(credentials.siteUrl)) {
      this.addError(errors, 'siteUrl', 'Invalid WordPress site URL');
    }

    if (!credentials.username) {
      this.addError(errors, 'username', 'Username is required');
    }

    if (!credentials.password) {
      this.addError(errors, 'password', 'Application password is required');
    }

    // Validate asset
    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Article title is required');
    } else if (asset.title.length > 255) {
      this.addWarning(warnings, 'title', 'Title will be truncated to 255 characters');
    }

    if (!asset.bodyMarkdown || asset.bodyMarkdown.trim().length === 0) {
      this.addError(errors, 'content', 'Article content is required');
    }

    if (asset.tags && asset.tags.length > 50) {
      this.addWarning(warnings, 'tags', 'Only first 50 tags will be used');
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
    const post: WordPressPost = {
      title: asset.title,
      content: asset.bodyMarkdown,
      status: 'draft',
    };

    // Add tags
    if (asset.tags && asset.tags.length > 0) {
      post.tags = asset.tags.slice(0, 50);
    }

    // Add canonical URL as comment if supported
    if (asset.canonicalUrl) {
      post.content = `<!-- Canonical URL: ${asset.canonicalUrl} -->\n${post.content}`;
    }

    // Add excerpt if available
    if (asset.excerpt) {
      post.content = `<p>${asset.excerpt}</p>\n${post.content}`;
    }

    return post as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `wp-${Date.now()}`,
        `${credentials.siteUrl}/?p=${Date.now()}`
      );
    }

    // Check rate limit
    if (!this.enforceRateLimit(credentials.siteUrl)) {
      return this.createErrorResult(
        'RATE_LIMIT_EXCEEDED',
        'WordPress API rate limit exceeded. Please try again later.',
        true
      );
    }

    try {
      const siteUrl = credentials.siteUrl.replace(/\/$/, '');
      const apiUrl = `${siteUrl}/wp-json/wp/v2/posts`;

      // Create Basic Auth header
      const authString = Buffer.from(
        `${credentials.username}:${credentials.password}`
      ).toString('base64');

      const response = await this.safeFetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
          'User-Agent': 'MassDistributionPlatform/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.message ||
          `WordPress API returned ${response.status}: ${response.statusText}`;

        return this.createErrorResult(
          `WP_${response.status}`,
          message,
          response.status >= 500
        );
      }

      const postData = await response.json();

      return this.createSuccessResult(
        postData.id.toString(),
        postData.link,
        {
          wpPostId: postData.id,
          status: postData.status,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(
        'WORDPRESS_ERROR',
        `Failed to publish to WordPress: ${message}`,
        true,
        { originalError: String(error) }
      );
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const validation = await this.validate(asset, {});

    const previewHtml = `
<article>
  <h1>${this.escapeHtml(String(mapped.title))}</h1>
  <div class="meta">
    <span class="tags">${(mapped.tags || []).map((tag: string) => `#${tag}`).join(' ')}</span>
  </div>
  <div class="content">
    ${this.markdownToHtml(String(mapped.content))}
  </div>
  ${asset.canonicalUrl ? `<p><em>Canonical URL: ${this.escapeHtml(asset.canonicalUrl)}</em></p>` : ''}
</article>
    `.trim();

    const warnings = [];
    if (String(mapped.title).length > 255) {
      warnings.push({
        type: 'optimization' as const,
        message: 'Title will be truncated to 255 characters',
        affectedField: 'title',
      });
    }

    return {
      destinationKey: 'wordpress',
      mappedFields: {
        title: String(mapped.title),
        tags: ((mapped.tags as string[]) || []).join(', '),
        status: String(mapped.status),
      },
      renderedPreview: previewHtml,
      warnings,
      suggestedEdits: [],
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    let html = markdown
      .split('\n\n')
      .map((para) => {
        if (para.startsWith('# ')) {
          return `<h2>${para.substring(2)}</h2>`;
        } else if (para.startsWith('## ')) {
          return `<h3>${para.substring(3)}</h3>`;
        } else if (para.startsWith('- ')) {
          const items = para
            .split('\n')
            .filter((line) => line.startsWith('- '))
            .map((line) => `<li>${line.substring(2)}</li>`);
          return `<ul>${items.join('')}</ul>`;
        } else {
          return `<p>${para}</p>`;
        }
      })
      .join('');

    return html;
  }
}
