import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface BingSubmissionCredentials {
  apiKey: string;
  siteUrl: string;
}

interface BingSubmissionPayload {
  siteUrl: string;
  urlList: string[];
}

export class BingSubmissionConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'bing',
      name: 'Bing URL Submission',
      group: 'feed',
      description: 'Submit URLs to Bing Webmaster Tools for indexing',
      supportsCanonical: false,
      authType: 'apikey',
      rateLimit: {
        requests: 100,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 255,
        maxContentLength: 10000,
        supportedFormats: ['plaintext'],
      },
    };
    super(config);
  }

  private readonly MAX_URLS_PER_BATCH = 500;

  async validate(
    asset: ContentAsset,
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!credentials.apiKey || !credentials.siteUrl) {
      this.addError(errors, 'credentials', 'API Key and Site URL are required');
    }

    if (credentials.siteUrl) {
      try {
        new URL(credentials.siteUrl);
      } catch {
        this.addError(errors, 'siteUrl', 'Site URL must be a valid URL');
      }
    }

    if (!asset.canonicalUrl && !asset.excerpt) {
      this.addWarning(warnings, 'content', 'URL to submit would be helpful');
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
    const urlList = asset.canonicalUrl ? [asset.canonicalUrl] : [];

    const payload: BingSubmissionPayload = {
      siteUrl: '',
      urlList: urlList.slice(0, this.MAX_URLS_PER_BATCH),
    };

    return payload as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `bing-${Date.now()}`,
        'https://www.bing.com/webmaster/'
      );
    }

    try {
      const submission = payload as BingSubmissionPayload;

      if (!submission.urlList || submission.urlList.length === 0) {
        return this.createErrorResult(
          'BING_NO_URLS',
          'No URLs provided for submission',
          false
        );
      }

      const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${credentials.apiKey}`;

      const response = await this.safeFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteUrl: credentials.siteUrl,
          urlList: submission.urlList,
        }),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `BING_${response.status}`,
          `Bing API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();

      const successCount = result.d && result.d.length > 0
        ? result.d.filter((item: any) => item.statusCode === 200).length
        : submission.urlList.length;

      return this.createSuccessResult(
        `batch_${Date.now()}`,
        'https://www.bing.com/webmaster/',
        {
          bingBatchId: `batch_${Date.now()}`,
          submittedCount: submission.urlList.length,
          successCount,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit URLs to Bing';
      return this.createErrorResult('BING_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const submission = mapped as BingSubmissionPayload;

    const previewHtml = `
<div style="padding: 16px; background: #f3f3f3; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #0078d4;">Bing URL Submission Preview</h3>
  <div style="background: white; padding: 12px; border-radius: 4px;">
    <p><strong>URLs to submit:</strong></p>
    <ul>
      ${submission.urlList.map(url => `<li>${this.escapeHtml(url)}</li>`).join('')}
    </ul>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'bing',
      mappedFields: {
        urlCount: submission.urlList.length.toString(),
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

export default BingSubmissionConnector;
