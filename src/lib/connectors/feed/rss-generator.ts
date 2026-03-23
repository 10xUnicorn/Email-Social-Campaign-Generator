import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  RSSChannel,
  RSSItem,
} from '@/types/connector';

export class RSSGeneratorConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'rss-generator',
      name: 'RSS Feed Generator',
      group: 'feed',
      description: 'Generate valid RSS 2.0 feed from campaign assets',
      supportsCanonical: true,
      authType: 'none',
      contentLimits: {
        maxContentLength: 10000000,
        supportedFormats: ['rss-xml'],
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

    // Validate asset
    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Article title is required');
    }

    if (!asset.bodyMarkdown || asset.bodyMarkdown.trim().length === 0) {
      this.addError(errors, 'content', 'Article content is required');
    }

    // Validate campaign/channel metadata
    if (!credentials.channelTitle) {
      this.addWarning(
        warnings,
        'channelTitle',
        'Channel title not provided. Using default.'
      );
    }

    if (!credentials.channelLink) {
      this.addWarning(
        warnings,
        'channelLink',
        'Channel link not provided. RSS feed may be incomplete.'
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
    // For RSS, we create an item object
    const item: RSSItem = {
      title: asset.title,
      link: asset.canonicalUrl || campaign.canonicalSiteUrl || '',
      guid: asset.id,
      description: this.buildDescription(asset),
      pubDate: new Date(asset.createdAt).toUTCString(),
      author: campaign.orgId ? `${campaign.orgId}@example.com` : undefined,
      category: asset.tags ? asset.tags.slice(0, 5) : undefined,
      image: asset.heroImage,
    };

    return item as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    // RSS generator doesn't "publish" - it returns generated XML
    // In a real scenario, this would save the RSS to a file or deliver it
    try {
      const rssXml = this.generateRSSFeed([payload as RSSItem], credentials);

      // Return success with metadata
      return this.createSuccessResult(
        `rss-${Date.now()}`,
        credentials.feedUrl,
        {
          xmlLength: rssXml.length,
          itemsCount: 1,
          feedUrl: credentials.feedUrl,
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return this.createErrorResult(
        'RSS_ERROR',
        `Failed to generate RSS feed: ${message}`,
        false,
        { originalError: String(error) }
      );
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const item: RSSItem = {
      title: asset.title,
      link: asset.canonicalUrl || campaign.canonicalSiteUrl || '',
      guid: asset.id,
      description: this.buildDescription(asset),
      pubDate: new Date(asset.createdAt).toUTCString(),
    };

    const rssSnippet = this.generateRSSItem(item);

    const previewHtml = `
<div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.85em; background: #f9f9f9;">
  <div style="font-weight: bold; margin-bottom: 8px; font-family: system-ui;">RSS Item Preview</div>
  <pre style="margin: 0; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(rssSnippet.substring(0, 500))}...</pre>
  <div style="margin-top: 8px; color: #666; font-family: system-ui;">
    Format: RSS 2.0 (Valid XML)
  </div>
</div>
    `.trim();

    const warnings = [];
    if (!asset.canonicalUrl && !campaign.canonicalSiteUrl) {
      warnings.push({
        type: 'optimization' as const,
        message: 'No canonical URL available. RSS link will be empty.',
        affectedField: 'link',
      });
    }

    return {
      destinationKey: 'rss-generator',
      mappedFields: {
        title: item.title,
        link: item.link || '(empty)',
        pubDate: item.pubDate,
        guid: item.guid,
      },
      renderedPreview: previewHtml,
      warnings,
      suggestedEdits: [],
    };
  }

  public generateRSSFeed(
    items: RSSItem[],
    credentials: Record<string, any>
  ): string {
    const channel: RSSChannel = {
      title: credentials.channelTitle || 'Content Feed',
      link: credentials.channelLink || 'https://example.com',
      description:
        credentials.channelDescription || 'Content distribution feed',
      language: credentials.language || 'en',
      items,
      webSubHub: credentials.webSubHubUrl,
    };

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${this.escapeXml(channel.title)}</title>
    <link>${this.escapeXml(channel.link)}</link>
    <description>${this.escapeXml(channel.description)}</description>
    <language>${channel.language || 'en'}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${channel.webSubHub ? `<atom:link href="${this.escapeXml(channel.webSubHub)}" rel="hub" />` : ''}
    <atom:link href="${this.escapeXml(credentials.feedUrl || channel.link)}" rel="self" type="application/rss+xml" />
${channel.items.map((item) => this.generateRSSItem(item)).join('')}
  </channel>
</rss>`;

    return rssXml;
  }

  private generateRSSItem(item: RSSItem): string {
    return `    <item>
      <title>${this.escapeXml(item.title)}</title>
      <link>${this.escapeXml(item.link)}</link>
      <guid isPermaLink="false">${this.escapeXml(item.guid)}</guid>
      <description>${this.escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      ${item.author ? `<author>${this.escapeXml(item.author)}</author>` : ''}
      ${item.category ? item.category.map((cat) => `<category>${this.escapeXml(cat)}</category>`).join('\n      ') : ''}
      ${item.image ? `<image><url>${this.escapeXml(item.image)}</url></image>` : ''}
      ${item.comments ? `<comments>${this.escapeXml(item.comments)}</comments>` : ''}
    </item>
`;
  }

  private buildDescription(asset: ContentAsset): string {
    let description = '';

    if (asset.excerpt) {
      description = asset.excerpt;
    } else if (asset.bodyMarkdown) {
      // Extract plain text from markdown, limit to 300 chars
      const plainText = this.markdownToPlainText(asset.bodyMarkdown);
      description = plainText.length > 300 ? plainText.substring(0, 300) + '...' : plainText;
    }

    return description;
  }

  private escapeXml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
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
