import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export interface PageContent {
  url: string;
  title: string;
  description: string;
  canonicalUrl?: string;
  headings: Heading[];
  bodyText: string;
  bodyMarkdown: string;
  images: ImageData[];
  links: LinkData[];
  ogTags: Record<string, string>;
  structuredData?: Record<string, any>[];
}

export interface Heading {
  level: 1 | 2 | 3;
  text: string;
}

export interface ImageData {
  src: string;
  alt: string;
  title?: string;
}

export interface LinkData {
  url: string;
  text: string;
  type: 'internal' | 'external';
  title?: string;
}

export class HtmlExtractor {
  private turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    preformattedCode: true,
  });

  extractContent(html: string, url: string): PageContent {
    const $ = cheerio.load(html) as cheerio.CheerioAPI;

    // Extract title
    const title = this.extractTitle($);

    // Extract description
    const description = this.extractDescription($);

    // Extract canonical URL
    const canonicalUrl = this.extractCanonical($);

    // Extract headings
    const headings = this.extractHeadings($);

    // Extract body text and markdown
    const { bodyText, bodyMarkdown } = this.extractBody($);

    // Extract images
    const images = this.extractImages($);

    // Extract links
    const links = this.extractLinks($, url);

    // Extract Open Graph tags
    const ogTags = this.extractOgTags($);

    // Extract structured data
    const structuredData = this.extractStructuredData($);

    return {
      url,
      title,
      description,
      canonicalUrl,
      headings,
      bodyText,
      bodyMarkdown,
      images,
      links,
      ogTags,
      structuredData,
    };
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    // Try og:title first
    let title = $('meta[property="og:title"]').attr('content')?.trim();
    if (title) return title;

    // Fall back to <title>
    title = $('title').text().trim();
    if (title) return title;

    // Fall back to h1
    title = $('h1').first().text().trim();
    return title || 'Untitled';
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    // Try og:description
    let desc = $('meta[property="og:description"]').attr('content')?.trim();
    if (desc) return desc;

    // Try meta description
    desc = $('meta[name="description"]').attr('content')?.trim();
    if (desc) return desc;

    // Try meta og:description
    desc = $('meta[name="og:description"]').attr('content')?.trim();
    return desc || '';
  }

  private extractCanonical($: cheerio.CheerioAPI): string | undefined {
    return $('link[rel="canonical"]').attr('href');
  }

  private extractHeadings($: cheerio.CheerioAPI): Heading[] {
    const headings: Heading[] = [];

    $('h1, h2, h3').each((_, element) => {
      const text = $(element).text().trim();
      const level = parseInt((element as any).tagName[1], 10) as 1 | 2 | 3;

      if (text && level >= 1 && level <= 3) {
        headings.push({ level, text });
      }
    });

    return headings;
  }

  private extractBody(
    $: cheerio.CheerioAPI
  ): { bodyText: string; bodyMarkdown: string } {
    // Clone to avoid modifying original
    const $clone = $.load($.html());

    // Remove unwanted elements
    $clone(
      'script, style, nav, footer, .sidebar, [class*="nav"], [class*="footer"], [class*="sidebar"]'
    ).remove();

    // Get main content area if available
    let $main =
      $clone('main') ||
      $clone('[role="main"]') ||
      $clone('article') ||
      $clone('.main-content, .content, .post-content');

    if ($main.length === 0) {
      $main = $clone('body');
    }

    // Extract text
    const bodyText = $main
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);

    // Extract and convert to markdown
    const bodyHtml = $main.html() || '';
    const bodyMarkdown = this.convertToMarkdown(bodyHtml);

    return { bodyText, bodyMarkdown };
  }

  private extractImages($: cheerio.CheerioAPI): ImageData[] {
    const images: ImageData[] = [];

    $('img').each((_, element) => {
      const src = $(element).attr('src')?.trim();
      const alt = $(element).attr('alt')?.trim() || '';
      const title = $(element).attr('title')?.trim();

      if (src) {
        images.push({
          src,
          alt,
          ...(title && { title }),
        });
      }
    });

    return images;
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): LinkData[] {
    const links: LinkData[] = [];
    const baseUrlObj = new URL(baseUrl);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')?.trim();
      const text = $(element).text().trim();
      const title = $(element).attr('title')?.trim();

      if (!href || !text) return;

      try {
        const linkUrl = new URL(href, baseUrl);
        const isInternal =
          linkUrl.hostname === baseUrlObj.hostname ||
          href.startsWith('/') ||
          href.startsWith('#');

        links.push({
          url: linkUrl.href,
          text,
          type: isInternal ? 'internal' : 'external',
          ...(title && { title }),
        });
      } catch {
        // Skip invalid URLs
      }
    });

    return links;
  }

  private extractOgTags($: cheerio.CheerioAPI): Record<string, string> {
    const ogTags: Record<string, string> = {};

    $('meta[property^="og:"]').each((_, element) => {
      const property = $(element).attr('property')?.replace('og:', '');
      const content = $(element).attr('content');

      if (property && content) {
        ogTags[property] = content;
      }
    });

    return ogTags;
  }

  private extractStructuredData($: cheerio.CheerioAPI): Record<string, any>[] {
    const structuredData: Record<string, any>[] = [];

    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '{}');
        structuredData.push(json);
      } catch {
        // Invalid JSON, skip
      }
    });

    return structuredData;
  }

  convertToMarkdown(html: string): string {
    try {
      // Clean up the HTML first
      const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

      const markdown = this.turndown.turndown(cleanHtml);

      // Clean up excessive whitespace
      return markdown
        .replace(/\n\n\n+/g, '\n\n')
        .replace(/\n\s+\n/g, '\n\n')
        .trim();
    } catch (error) {
      console.error('Error converting HTML to markdown:', error);
      return '';
    }
  }
}
