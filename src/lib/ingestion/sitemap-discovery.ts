import { parseStringPromise } from 'xml2js';

export interface DiscoveredPage {
  url: string;
  lastmod?: Date;
  priority?: number;
  html?: string;
}

interface SitemapUrl {
  loc: string[];
  lastmod?: string[];
  priority?: string[];
}

interface SitemapIndex {
  sitemap: Array<{
    loc: string[];
  }>;
}

interface Sitemap {
  urlset?: {
    url?: SitemapUrl[];
  };
  sitemapindex?: {
    sitemap?: Array<{
      loc: string[];
    }>;
  };
}

const RATE_LIMIT_DELAY = 1000; // 1 second between requests

export class SitemapDiscovery {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  async discoverSitemaps(baseUrl: string): Promise<string[]> {
    const baseUrlObj = new URL(baseUrl);
    const sitemapUrls: Set<string> = new Set();

    // Try robots.txt
    try {
      const robotsUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/robots.txt`;
      const robotsResponse = await this.fetchWithRetry(robotsUrl);
      if (robotsResponse) {
        const sitemapMatches = robotsResponse.match(/Sitemap:\s*(.+)/gi);
        if (sitemapMatches) {
          sitemapMatches.forEach((match) => {
            const url = match.replace(/Sitemap:\s*/i, '').trim();
            if (url) {
              sitemapUrls.add(url);
            }
          });
        }
      }
    } catch (error) {
      // robots.txt not found, continue
    }

    // Try common sitemap locations
    const commonLocations = [
      `${baseUrlObj.protocol}//${baseUrlObj.host}/sitemap.xml`,
      `${baseUrlObj.protocol}//${baseUrlObj.host}/sitemap_index.xml`,
      `${baseUrlObj.protocol}//${baseUrlObj.host}/sitemap.xml.gz`,
    ];

    for (const url of commonLocations) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': this.userAgent },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });
        if (response.ok) {
          sitemapUrls.add(url);
        }
      } catch {
        // URL doesn't exist, continue
      }
    }

    return Array.from(sitemapUrls);
  }

  async parseSitemap(sitemapUrl: string): Promise<DiscoveredPage[]> {
    try {
      const xmlContent = await this.fetchWithRetry(sitemapUrl);
      if (!xmlContent) {
        return [];
      }

      const parsed: Sitemap = await parseStringPromise(xmlContent, {
        explicitArray: true,
        mergeAttrs: false,
      });

      const pages: DiscoveredPage[] = [];

      // Handle sitemap URLs
      if (parsed.urlset?.url) {
        for (const urlEntry of parsed.urlset.url) {
          const page: DiscoveredPage = {
            url: urlEntry.loc?.[0] || '',
          };

          if (urlEntry.lastmod?.[0]) {
            page.lastmod = new Date(urlEntry.lastmod[0]);
          }

          if (urlEntry.priority?.[0]) {
            page.priority = parseFloat(urlEntry.priority[0]);
          }

          if (page.url) {
            pages.push(page);
          }
        }
      }

      // Handle sitemap index (recursive)
      if (parsed.sitemapindex?.sitemap) {
        for (const sitemapEntry of parsed.sitemapindex.sitemap) {
          const childSitemapUrl = sitemapEntry.loc?.[0];
          if (childSitemapUrl) {
            const childPages = await this.parseSitemap(childSitemapUrl);
            pages.push(...childPages);
            await this.delay(RATE_LIMIT_DELAY);
          }
        }
      }

      return pages;
    } catch (error) {
      console.error(`Failed to parse sitemap ${sitemapUrl}:`, error);
      return [];
    }
  }

  async crawlPages(
    urls: string[],
    maxPages: number = 50,
    onProgress?: (current: number, total: number) => void
  ): Promise<DiscoveredPage[]> {
    const limitedUrls = urls.slice(0, maxPages);
    const pages: DiscoveredPage[] = [];

    for (let i = 0; i < limitedUrls.length; i++) {
      const url = limitedUrls[i];
      onProgress?.(i + 1, limitedUrls.length);

      try {
        const html = await this.fetchWithRetry(url);
        if (html) {
          const page: DiscoveredPage = {
            url,
            html,
          };
          pages.push(page);
        }
      } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
      }

      if (i < limitedUrls.length - 1) {
        await this.delay(RATE_LIMIT_DELAY);
      }
    }

    return pages;
  }

  private async fetchWithRetry(
    url: string,
    maxRetries: number = 3
  ): Promise<string | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': this.userAgent },
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          return await response.text();
        }

        if (response.status === 429) {
          // Rate limited, wait and retry
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        if (response.status >= 400) {
          return null;
        }
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
