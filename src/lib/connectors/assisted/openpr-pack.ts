import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface OpenPRCredentials {
  apiKey: string;
}

interface OpenPRContent {
  title: string;
  content: string;
  category?: string;
  keywords?: string[];
  sourceUrl?: string;
}

export class OpenPRPackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'openpr',
      name: 'openPR Distribution Pack',
      group: 'assist',
      description: 'Press release distribution through openPR (1 free per 30 days)',
      supportsCanonical: false,
      authType: 'apikey',
      rateLimit: {
        requests: 1,
        periodSeconds: 2592000, // 30 days in seconds
      },
      contentLimits: {
        maxTitleLength: 255,
        maxContentLength: 10000,
        supportedFormats: ['plaintext', 'markdown'],
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

    if (!credentials.apiKey) {
      this.addError(errors, 'credentials', 'API Key is required');
    }

    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Press release title is required');
    }

    if (!asset.bodyMarkdown && !asset.excerpt) {
      this.addError(errors, 'content', 'Press release content is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private formatEditorialContent(content: string): string {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());

    return paragraphs
      .map((para) => {
        const cleaned = para.trim();
        if (paragraphs.indexOf(para) === 0) {
          return `**${cleaned}**`;
        }
        return cleaned;
      })
      .join('\n\n');
  }

  private formatForOpenPR(content: OpenPRContent): string {
    const formatLines: string[] = [];

    formatLines.push(`**${content.title}**`);
    formatLines.push('');

    formatLines.push(this.formatEditorialContent(content.content));
    formatLines.push('');

    if (content.keywords && content.keywords.length > 0) {
      formatLines.push(`**Keywords:** ${content.keywords.join(', ')}`);
      formatLines.push('');
    }

    if (content.sourceUrl) {
      formatLines.push(`**Source:** ${content.sourceUrl}`);
    }

    return formatLines.join('\n');
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const content: OpenPRContent = {
      title: asset.title,
      content: asset.bodyMarkdown || asset.excerpt || '',
      keywords: asset.tags || [],
      sourceUrl: asset.canonicalUrl,
    };

    return content as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `openpr-${Date.now()}`,
        'https://www.openpr.de/'
      );
    }

    try {
      const content = payload as OpenPRContent;
      const formattedContent = this.formatForOpenPR(content);

      const endpoint = 'https://www.openpr.de/api/v1/press-releases';

      const response = await this.safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.apiKey}`,
        },
        body: JSON.stringify({
          title: content.title,
          content: formattedContent,
          category: content.category || 'General',
          language: 'en',
        }),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `OPENPR_${response.status}`,
          `openPR API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();

      return this.createSuccessResult(result.id, result.url || 'https://www.openpr.de/', {
        openprId: result.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit to openPR';
      return this.createErrorResult('OPENPR_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const content = mapped as OpenPRContent;
    const formatted = this.formatForOpenPR(content);

    const previewHtml = `
<article style="padding: 16px; background: #f3f3f3; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #2c3e50;">openPR Press Release Preview</h3>
  <div style="background: white; padding: 12px; border-radius: 4px;">
    <h4>${this.escapeHtml(content.title)}</h4>
    <div style="white-space: pre-wrap; word-wrap: break-word; color: #333;">
      ${this.escapeHtml(formatted.substring(0, 500))}...
    </div>
  </div>
</article>
    `.trim();

    return {
      destinationKey: 'openpr',
      mappedFields: {
        title: content.title,
        keywords: content.keywords?.join(', ') || '',
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

export default OpenPRPackConnector;
