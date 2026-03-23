import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface HashnodeCredentials {
  token: string;
  username?: string;
}

interface HashnodePublishInput {
  title: string;
  contentMarkdown: string;
  canonicalUrl?: string;
  tags: Array<{ name: string }>;
  isPartOfPublication?: {
    id: string;
  };
}

export class HashnodeConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'hashnode',
      name: 'Hashnode',
      group: 'api',
      description: 'Publish articles to Hashnode via GraphQL API',
      supportsCanonical: true,
      authType: 'apikey',
      rateLimit: {
        requests: 10,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 255,
        maxContentLength: 100000,
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

    if (!credentials.token) {
      this.addError(errors, 'credentials', 'API Token is required');
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
    const input: HashnodePublishInput = {
      title: asset.title,
      contentMarkdown: asset.bodyMarkdown || asset.excerpt || '',
      canonicalUrl: asset.canonicalUrl,
      tags: asset.tags ? asset.tags.map(tag => ({ name: tag })) : [],
    };

    return input as unknown as MappedPayload;
  }

  private buildPublishMutation(input: HashnodePublishInput): string {
    const tagsInput = input.tags
      .map(
        (tag) =>
          `{name: "${tag.name.replace(/"/g, '\\"')}", slug: "${tag.name.toLowerCase().replace(/\s+/g, '-')}"}`
      )
      .join(',');

    const canonicalUrl = input.canonicalUrl ? `canonicalUrl: "${input.canonicalUrl}"` : '';

    return `
      mutation PublishPost {
        publishPost(input: {
          title: "${input.title.replace(/"/g, '\\"')}"
          contentMarkdown: """${input.contentMarkdown.replace(/"""/g, '\\"""')}"""
          ${canonicalUrl ? canonicalUrl + ',' : ''}
          tags: [${tagsInput}]
        }) {
          post {
            id
            title
            url
            slug
          }
        }
      }
    `;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `hashnode-${Date.now()}`,
        `https://hashnode.com/post/${Date.now()}`
      );
    }

    try {
      const input = payload as HashnodePublishInput;
      const mutation = this.buildPublishMutation(input);

      const response = await this.safeFetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: credentials.token,
        },
        body: JSON.stringify({
          query: mutation,
        }),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `HASHNODE_${response.status}`,
          `Hashnode API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();

      if (result.errors) {
        return this.createErrorResult(
          'HASHNODE_GRAPHQL_ERROR',
          'GraphQL error',
          false,
          result.errors
        );
      }

      const post = result.data?.publishPost?.post;

      if (!post) {
        return this.createErrorResult(
          'HASHNODE_NO_POST',
          'No post returned from Hashnode',
          false
        );
      }

      return this.createSuccessResult(post.id, post.url, {
        hashnodePostId: post.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to Hashnode';
      return this.createErrorResult('HASHNODE_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const input = mapped as HashnodePublishInput;

    const previewHtml = `
<article>
  <h1>${this.escapeHtml(input.title)}</h1>
  <div class="tags">${(input.tags || []).map(tag => `#${tag.name}`).join(' ')}</div>
  <div class="content">
    ${this.escapeHtml(input.contentMarkdown.substring(0, 500))}...
  </div>
  ${input.canonicalUrl ? `<p><em>Canonical: ${this.escapeHtml(input.canonicalUrl)}</em></p>` : ''}
</article>
    `.trim();

    return {
      destinationKey: 'hashnode',
      mappedFields: {
        title: input.title,
        tags: (input.tags || []).map(t => t.name).join(', '),
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

export default HashnodeConnector;
