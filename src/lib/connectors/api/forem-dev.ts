import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  ForemArticle,
} from '@/types/connector';

export class ForemDevConnector extends BaseConnector {
  private readonly API_BASE = 'https://dev.to/api/articles';

  constructor() {
    const config: DestinationConfig = {
      key: 'forem-dev',
      name: 'DEV.to (Forem)',
      group: 'api',
      description: 'Publish articles to DEV.to community',
      supportsCanonical: true,
      authType: 'apikey',
      rateLimit: {
        requests: 10,
        periodSeconds: 30,
      },
      contentLimits: {
        maxTitleLength: 128,
        maxContentLength: 1000000,
        maxTagsCount: 4,
        supportedFormats: ['markdown'],
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
      this.addError(errors, 'apiKey', 'DEV.to API key is required');
    }

    // Validate asset
    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Article title is required');
    } else if (asset.title.length > 128) {
      this.addWarning(
        warnings,
        'title',
        'Title exceeds 128 characters and will be truncated'
      );
    }

    if (!asset.bodyMarkdown || asset.bodyMarkdown.trim().length === 0) {
      this.addError(errors, 'bodyMarkdown', 'Article content is required');
    }

    if (asset.tags && asset.tags.length > 4) {
      this.addWarning(
        warnings,
        'tags',
        'DEV.to allows maximum 4 tags. Only first 4 will be used.'
      );
    }

    // DEV.to requires specific tag format
    if (asset.tags && asset.tags.length > 0) {
      const invalidTags = asset.tags.filter((tag) => tag.length > 30);
      if (invalidTags.length > 0) {
        this.addWarning(
          warnings,
          'tags',
          'Some tags exceed 30 characters and may be rejected'
        );
      }
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
    // Build front matter with canonical URL
    let bodyMarkdown = asset.bodyMarkdown;

    // Add front matter if canonical URL exists
    if (asset.canonicalUrl) {
      const frontMatter = `---
canonical_url: ${asset.canonicalUrl}
---

`;
      bodyMarkdown = frontMatter + bodyMarkdown;
    }

    // Build Forem article object
    const article: ForemArticle = {
      article: {
        title: this.truncateText(asset.title, 128),
        body_markdown: bodyMarkdown,
        published: false, // Publish as draft by default
        tags: asset.tags ? asset.tags.slice(0, 4) : [],
        canonical_url: asset.canonicalUrl,
      },
    };

    return article as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `forem-${Date.now()}`,
        `https://dev.to/articles/${Date.now()}`
      );
    }

    // Check rate limit (10 requests per 30 seconds)
    if (!this.enforceRateLimit(credentials.apiKey)) {
      return this.createErrorResult(
        'RATE_LIMIT_EXCEEDED',
        'DEV.to API rate limit exceeded (10 requests per 30 seconds)',
        true
      );
    }

    try {
      const response = await this.safeFetch(this.API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': credentials.apiKey,
          'User-Agent': 'MassDistributionPlatform/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `DEV.to API returned ${response.status}`;
        let errorDetails: Record<string, any> = {};

        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.errors) {
            errorMessage = Array.isArray(errorData.errors)
              ? errorData.errors.join(', ')
              : String(errorData.errors);
          }
          errorDetails = errorData;
        } catch {
          // Use default error message
        }

        return this.createErrorResult(
          `FOREM_${response.status}`,
          errorMessage,
          response.status >= 500,
          errorDetails
        );
      }

      const articleData = await response.json();

      return this.createSuccessResult(
        articleData.id.toString(),
        articleData.url,
        {
          foremArticleId: articleData.id,
          publishedAt: articleData.published_at,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(
        'FOREM_ERROR',
        `Failed to publish to DEV.to: ${message}`,
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

    const article = mapped as ForemArticle;
    const tags = article.article.tags || [];

    const previewHtml = `
<article>
  <h1>${this.escapeHtml(article.article.title)}</h1>
  <div class="meta">
    <span class="tags">${tags.map((tag) => `#${tag}`).join(' ')}</span>
    <span class="status">Status: Draft</span>
  </div>
  <div class="content">
    ${this.markdownToHtml(article.article.body_markdown)}
  </div>
  ${article.article.canonical_url ? `<p><em>Canonical URL: ${this.escapeHtml(article.article.canonical_url)}</em></p>` : ''}
  <p style="color: #999; font-size: 0.9em;">Published on DEV.to Community</p>
</article>
    `.trim();

    const warnings = [];
    if (article.article.title.length > 128) {
      warnings.push({
        type: 'optimization' as const,
        message: 'Title exceeds 128 character limit and will be truncated',
        affectedField: 'title',
      });
    }

    if (tags.length > 4) {
      warnings.push({
        type: 'compliance' as const,
        message: 'Only first 4 tags will be published',
        affectedField: 'tags',
      });
    }

    return {
      destinationKey: 'forem-dev',
      mappedFields: {
        title: article.article.title,
        tags: tags.join(', '),
        status: 'Draft',
        canonical_url: article.article.canonical_url || 'None',
      },
      renderedPreview: previewHtml,
      warnings,
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
    return text.replace(/[&<>"']/g, (char) => map[char]);
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
        } else if (para.startsWith('### ')) {
          return `<h4>${para.substring(4)}</h4>`;
        } else if (para.startsWith('- ') || para.startsWith('* ')) {
          const items = para
            .split('\n')
            .filter((line) => line.startsWith('- ') || line.startsWith('* '))
            .map((line) => {
              const content = line.substring(2);
              return `<li>${content}</li>`;
            });
          return `<ul>${items.join('')}</ul>`;
        } else if (para.startsWith('```')) {
          return `<pre><code>${para.replace(/```/g, '')}</code></pre>`;
        } else {
          return `<p>${para}</p>`;
        }
      })
      .join('');

    // Handle inline formatting
    html = html
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    return html;
  }
}
