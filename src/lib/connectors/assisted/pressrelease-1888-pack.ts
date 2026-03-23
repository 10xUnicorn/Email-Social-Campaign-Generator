import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface PressRelease1888Credentials {
  apiKey: string;
  accountId: string;
}

interface PressRelease1888Content {
  title: string;
  content: string;
  category?: string;
  keywords?: string[];
  sourceUrl?: string;
}

interface RejectionRiskChecklist {
  hasNewsValue: boolean;
  isProfessional: boolean;
  noAdvertising: boolean;
  uniqueContent: boolean;
  properFormatting: boolean;
  risks: string[];
}

export class PressRelease1888PackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'pressrelease1888',
      name: '1888 Press Release Distribution',
      group: 'assist',
      description: 'Press release distribution through 1888PressRelease with editorial guidelines',
      supportsCanonical: false,
      authType: 'apikey',
      rateLimit: {
        requests: 10,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 200,
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

    if (!credentials.apiKey || !credentials.accountId) {
      this.addError(errors, 'credentials', 'API Key and Account ID are required');
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

  private assessRejectionRisk(content: PressRelease1888Content): RejectionRiskChecklist {
    const risks: string[] = [];
    const title = content.title || '';
    const body = content.content || '';

    const hasNewsValue =
      title.length > 10 &&
      body.length > 200 &&
      /[a-z]/i.test(body) &&
      (body.toLowerCase().includes('announce') ||
        body.toLowerCase().includes('launch') ||
        body.toLowerCase().includes('new') ||
        body.toLowerCase().includes('expand'));

    if (!hasNewsValue) {
      risks.push('Content may lack news value');
    }

    const isProfessional =
      /^\s*[A-Z]/.test(title) && /[.!?]\s*$/.test(body) && body.split('\n').length > 1;

    if (!isProfessional) {
      risks.push('Content formatting appears unprofessional');
    }

    const hasAdvertising =
      /^\s*call\s+(?:now|today)|sign\s+up|buy\s+now|limited\s+(?:offer|time)|click\s+here/i.test(
        body
      ) ||
      /\$\d+|www\.\S+\.(com|net|org|biz|info)\/(?:discount|promo|deal|offer)/i.test(body);

    if (hasAdvertising) {
      risks.push('Content contains advertising language - may be rejected');
    }

    const uniqueContent = new Set(body.split(/\s+/).slice(0, 50)).size > 30;

    if (!uniqueContent) {
      risks.push('Content may be too repetitive');
    }

    const properFormatting = body.includes('\n') && title.length > 5 && title.length < 200;

    if (!properFormatting) {
      risks.push('Title or formatting does not meet standards');
    }

    return {
      hasNewsValue,
      isProfessional,
      noAdvertising: !hasAdvertising,
      uniqueContent,
      properFormatting,
      risks,
    };
  }

  private formatAsNewsFraming(content: PressRelease1888Content): string {
    const sections: string[] = [];

    sections.push(`PRESS RELEASE: ${content.title}`);
    sections.push('');

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    sections.push(`${today} --`);
    sections.push('');

    sections.push(content.content);
    sections.push('');

    if (content.sourceUrl) {
      sections.push('For more information, visit: ' + content.sourceUrl);
      sections.push('');
    }

    if (content.keywords && content.keywords.length > 0) {
      sections.push('Keywords: ' + content.keywords.join(', '));
    }

    return sections.join('\n');
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const content: PressRelease1888Content = {
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
        `pressrelease1888-${Date.now()}`,
        'https://www.1888pressrelease.com/'
      );
    }

    try {
      const content = payload as PressRelease1888Content;

      const riskAssessment = this.assessRejectionRisk(content);
      const formattedContent = this.formatAsNewsFraming(content);

      const endpoint = 'https://www.1888pressrelease.com/api/v1/submit';

      const response = await this.safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': credentials.apiKey,
        },
        body: JSON.stringify({
          accountId: credentials.accountId,
          headline: content.title,
          content: formattedContent,
          category: content.category || 'Business',
          keywords: content.keywords,
        }),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `PRESSRELEASE1888_${response.status}`,
          `1888 Press Release API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();

      return this.createSuccessResult(result.id, result.url || 'https://www.1888pressrelease.com/', {
        pressRelease1888Id: result.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit to 1888 Press Release';
      return this.createErrorResult('PRESSRELEASE1888_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const content = mapped as PressRelease1888Content;
    const formatted = this.formatAsNewsFraming(content);

    const previewHtml = `
<article style="padding: 16px; background: #f3f3f3; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #2c3e50;">1888 Press Release Preview</h3>
  <div style="background: white; padding: 12px; border-radius: 4px;">
    <h4>${this.escapeHtml(content.title)}</h4>
    <div style="white-space: pre-wrap; word-wrap: break-word; color: #333;">
      ${this.escapeHtml(formatted.substring(0, 500))}...
    </div>
  </div>
</article>
    `.trim();

    return {
      destinationKey: 'pressrelease1888',
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

export default PressRelease1888PackConnector;
