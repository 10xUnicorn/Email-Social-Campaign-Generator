import { SiteBrief, ClaimsMap } from '../../types';
import { SitemapDiscovery } from './sitemap-discovery';
import { HtmlExtractor, PageContent } from './html-extractor';
import { OfferExtractor, OffersData } from './offer-extractor';
import { SiteBriefGenerator } from './site-brief-generator';

export interface IngestionResult {
  siteBrief: SiteBrief;
  claimsMap: ClaimsMap;
  pages: PageContent[];
}

export interface IngestionProgress {
  stage: 'discovering' | 'fetching' | 'extracting' | 'analyzing' | 'complete';
  progress: number;
  total: number;
  message: string;
}

export class IngestionService {
  private sitemapDiscovery = new SitemapDiscovery();
  private htmlExtractor = new HtmlExtractor();
  private offerExtractor = new OfferExtractor();
  private sitemapGenerator = new SiteBriefGenerator();

  async ingest(
    url: string,
    maxPages: number = 50,
    onProgress?: (status: IngestionProgress) => void
  ): Promise<IngestionResult> {
    try {
      // Stage 1: Discover sitemaps
      onProgress?.({
        stage: 'discovering',
        progress: 0,
        total: 1,
        message: 'Discovering sitemaps...',
      });

      const sitemapUrls = await this.sitemapDiscovery.discoverSitemaps(url);
      if (sitemapUrls.length === 0) {
        throw new Error('No sitemaps found for the provided URL');
      }

      onProgress?.({
        stage: 'discovering',
        progress: 1,
        total: 1,
        message: `Found ${sitemapUrls.length} sitemap(s)`,
      });

      // Stage 2: Parse sitemaps
      const allPages: Array<{ url: string; lastmod?: Date; priority?: number }> =
        [];
      for (const sitemapUrl of sitemapUrls) {
        const pages = await this.sitemapDiscovery.parseSitemap(sitemapUrl);
        allPages.push(...pages);
      }

      const uniqueUrls = Array.from(new Set(allPages.map((p) => p.url)));
      onProgress?.({
        stage: 'fetching',
        progress: 0,
        total: Math.min(uniqueUrls.length, maxPages),
        message: `Found ${uniqueUrls.length} pages, fetching top ${Math.min(uniqueUrls.length, maxPages)}...`,
      });

      // Stage 3: Fetch pages
      const pagesToFetch = uniqueUrls.slice(0, maxPages);
      const fetchedPages = await this.sitemapDiscovery.crawlPages(
        pagesToFetch,
        maxPages,
        (current, total) => {
          onProgress?.({
            stage: 'fetching',
            progress: current,
            total,
            message: `Fetching page ${current} of ${total}...`,
          });
        }
      );

      onProgress?.({
        stage: 'extracting',
        progress: 0,
        total: fetchedPages.length,
        message: 'Extracting page content...',
      });

      // Stage 4: Extract content
      const extractedPages: PageContent[] = [];
      for (let i = 0; i < fetchedPages.length; i++) {
        const page = fetchedPages[i];
        if (page.html) {
          const content = this.htmlExtractor.extractContent(page.html, page.url);
          extractedPages.push(content);
        }

        onProgress?.({
          stage: 'extracting',
          progress: i + 1,
          total: fetchedPages.length,
          message: `Extracted ${i + 1} of ${fetchedPages.length} pages`,
        });
      }

      if (extractedPages.length === 0) {
        throw new Error('Failed to extract content from any pages');
      }

      onProgress?.({
        stage: 'analyzing',
        progress: 0,
        total: 3,
        message: 'Analyzing offers and pricing...',
      });

      // Stage 5: Extract offers
      const offers = await this.offerExtractor.extractOffers(extractedPages);

      onProgress?.({
        stage: 'analyzing',
        progress: 1,
        total: 3,
        message: 'Generating site brief and claims map...',
      });

      // Stage 6: Generate brief
      const { brief, claimsMap } = await this.sitemapGenerator.generateBrief(
        extractedPages,
        offers
      );

      onProgress?.({
        stage: 'complete',
        progress: 3,
        total: 3,
        message: 'Ingestion complete!',
      });

      return {
        siteBrief: brief,
        claimsMap,
        pages: extractedPages,
      };
    } catch (error) {
      console.error('Ingestion failed:', error);
      throw error;
    }
  }
}

// Export all types for convenience
export type { PageContent } from './html-extractor';
export type { OffersData } from './offer-extractor';
export { SitemapDiscovery } from './sitemap-discovery';
export { HtmlExtractor } from './html-extractor';
export { OfferExtractor } from './offer-extractor';
export { SiteBriefGenerator } from './site-brief-generator';
