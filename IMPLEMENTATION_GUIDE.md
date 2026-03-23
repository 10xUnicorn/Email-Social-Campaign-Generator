# Ingestion Service & Content Factory Implementation Guide

## Overview

This implementation provides a complete pipeline for ingesting website content and generating multi-channel content campaigns using Claude AI.

## File Locations

### Ingestion Service
- `/src/lib/ingestion/sitemap-discovery.ts` - Web crawling and sitemap parsing
- `/src/lib/ingestion/html-extractor.ts` - HTML parsing and content extraction
- `/src/lib/ingestion/offer-extractor.ts` - Offer and pricing extraction via Claude
- `/src/lib/ingestion/site-brief-generator.ts` - Site analysis and brief generation via Claude
- `/src/lib/ingestion/index.ts` - IngestionService orchestrator

### Content Factory
- `/src/lib/content-factory/campaign-planner.ts` - Campaign strategy via Claude
- `/src/lib/content-factory/asset-generator.ts` - Content asset generation via Claude
- `/src/lib/content-factory/rewriter.ts` - Destination-specific variant generation
- `/src/lib/content-factory/index.ts` - ContentFactory orchestrator

## Usage Examples

### Step 1: Ingest Website Content

```typescript
import { IngestionService } from '@/lib/ingestion';

const ingestion = new IngestionService();

const result = await ingestion.ingest(
  'https://example.com',
  50, // maxPages
  (progress) => {
    console.log(`${progress.stage}: ${progress.message}`);
    console.log(`Progress: ${progress.progress}/${progress.total}`);
  }
);

// Returns:
// {
//   siteBrief: SiteBrief,
//   claimsMap: ClaimsMap,
//   pages: PageContent[]
// }
```

### Step 2: Generate Campaign Content

```typescript
import { ContentFactory } from '@/lib/content-factory';

const factory = new ContentFactory();

const campaign = await factory.generateCampaign(
  result.siteBrief,
  result.claimsMap,
  complianceSettings, // optional
  (progress) => {
    console.log(`${progress.stage}: ${progress.message}`);
  }
);

// Returns:
// {
//   campaignSpec: CampaignSpec,
//   assets: {
//     articles: ArticleAsset[],
//     pressRelease: GeneratedAsset,
//     newsletter: GeneratedAsset,
//     socialSnippets: SocialSnippet[],
//     videoScript: VideoScript,
//     podcastScript: PodcastScript
//   }
// }
```

### Step 3: Convert to Database Model

```typescript
const dbAssets = factory.convertToContentAssets(
  campaignId,
  campaign
);

// Now ready to save to database:
// dbAssets: ContentAsset[]
```

## Key Classes and Methods

### IngestionService

```typescript
// Main ingestion pipeline
async ingest(
  url: string,
  maxPages?: number,
  onProgress?: (status: IngestionProgress) => void
): Promise<IngestionResult>
```

### SitemapDiscovery

```typescript
// Discover sitemaps from robots.txt and common locations
async discoverSitemaps(baseUrl: string): Promise<string[]>

// Parse XML sitemap (handles sitemap indexes recursively)
async parseSitemap(sitemapUrl: string): Promise<DiscoveredPage[]>

// Crawl pages with rate limiting
async crawlPages(
  urls: string[],
  maxPages?: number,
  onProgress?: (current: number, total: number) => void
): Promise<DiscoveredPage[]>
```

### HtmlExtractor

```typescript
// Extract structured content from HTML
extractContent(html: string, url: string): PageContent

// Convert HTML to markdown
convertToMarkdown(html: string): string
```

### OfferExtractor

```typescript
// Extract offers, pricing, and social proof via Claude
async extractOffers(pages: PageContent[]): Promise<OffersData>
```

### SiteBriefGenerator

```typescript
// Generate site brief and claims map via Claude
async generateBrief(
  pages: PageContent[],
  offers: OffersData
): Promise<{ brief: SiteBrief; claimsMap: ClaimsMap }>
```

### ContentFactory

```typescript
// Main content generation pipeline
async generateCampaign(
  siteBrief: SiteBrief,
  claimsMap: ClaimsMap,
  complianceSettings?: ComplianceSettings,
  onProgress?: (status: ContentFactoryProgress) => void
): Promise<CampaignAssets>

// Convert generated assets to database model
convertToContentAssets(
  campaignId: string,
  campaignAssets: CampaignAssets
): ContentAsset[]
```

### CampaignPlanner

```typescript
// Generate campaign strategy via Claude
async planCampaign(
  siteBrief: SiteBrief,
  claimsMap: ClaimsMap
): Promise<CampaignSpec>
```

### AssetGenerator

```typescript
// Generate different asset types (all async)
async generateArticle(spec, pillar, brief): Promise<ArticleAsset>
async generatePressRelease(spec, brief): Promise<GeneratedAsset>
async generateNewsletter(spec, brief): Promise<GeneratedAsset>
async generateSocialSnippets(spec, brief, count?): Promise<SocialSnippet[]>
async generateVideoScript(spec, brief): Promise<VideoScript>
async generatePodcastScript(spec, brief): Promise<PodcastScript>
```

### Rewriter

```typescript
// Adapt content for specific destinations
async rewriteForDestination(
  content: string,
  destinationKey: string,
  brief: SiteBrief,
  maxRetries?: number
): Promise<RewriteResult>

// Calculate uniqueness score
async computeUniquenessScore(
  original: string,
  rewrite: string
): Promise<number>
```

## Core Interfaces

### IngestionResult
```typescript
{
  siteBrief: SiteBrief;
  claimsMap: ClaimsMap;
  pages: PageContent[];
}
```

### CampaignAssets
```typescript
{
  campaignSpec: CampaignSpec;
  assets: {
    articles: ArticleAsset[];
    pressRelease: GeneratedAsset;
    newsletter: GeneratedAsset;
    socialSnippets: SocialSnippet[];
    videoScript: VideoScript;
    podcastScript: PodcastScript;
  };
}
```

### AssetVariant
```typescript
{
  destinationKey: string;
  uniquenessScore: number;
  content: string;
  metadata?: Record<string, any>;
}
```

## Configuration

### Environment Variables
```
ANTHROPIC_API_KEY=sk-... # Required for Claude API calls
```

### Rate Limiting
- Default crawl rate: 1 request per second
- Configurable in SitemapDiscovery.crawlPages()
- Automatic retry with exponential backoff for rate limits

### Uniqueness Scoring
- Minimum acceptable: 40% (configurable in Rewriter constructor)
- Range: 0-100
- Method: Jaccard similarity + Claude API analysis
- Retry logic: Up to 3 attempts to meet uniqueness threshold

## Asset Types Generated

1. **Articles** (1500-2000 words)
   - 5 title options
   - Excerpt
   - Tags
   - CTA

2. **Press Releases** (300-500 words)
   - Journalistic style
   - Company quotes
   - Boilerplate

3. **Newsletters** (400-600 words)
   - Conversational tone
   - Multiple CTAs
   - Signature section

4. **Social Snippets** (10 per campaign)
   - Short form (280 chars)
   - Long form (1500 chars)
   - Hashtags
   - Platform-specific

5. **Video Scripts** (2-3 minutes)
   - Scene directions
   - YouTube metadata
   - Tags and keywords

6. **Podcast Scripts** (20-30 minutes)
   - Interview style
   - RSS metadata
   - Episode keywords

## Destination Variants

Supported destinations for variant generation:
- LinkedIn (professional, 1300-1500 words)
- Medium (storytelling, 1000-1300 words)
- Twitter (punchy, 280 chars)
- Email (benefit-focused, 300-500 words)
- Blog (SEO-optimized, 1500-2000 words)
- Reddit (community-focused)
- Quora (Q&A style)
- Facebook (casual, emoji-friendly)

Each variant:
- Is uniquely adapted to the platform
- Maintains core claims and CTAs
- Follows platform best practices
- Has uniqueness score (40%+ required)

## Error Handling

All services include:
- Retry logic with exponential backoff
- Fallback implementations
- Comprehensive error logging
- Graceful degradation

### Common Error Scenarios
- Network timeouts: Automatic retry with 3 attempts
- Rate limiting (429): Exponential backoff
- Invalid responses: Fallback to minimal valid output
- Missing data: Populated with reasonable defaults

## Performance Considerations

- Web crawling: 1 request/second with timeouts
- Claude API: Max 4096 tokens per request
- Caching: Not implemented (can be added for production)
- Parallel processing: Single-threaded sequential (can be parallelized)

## Testing

All classes can be tested independently:

```typescript
// Test Sitemap Discovery
const discovery = new SitemapDiscovery();
const sitemaps = await discovery.discoverSitemaps('https://example.com');

// Test HTML Extraction
const extractor = new HtmlExtractor();
const content = extractor.extractContent(htmlString, url);

// Test Offer Extraction
const offers = new OfferExtractor();
const offersData = await offers.extractOffers([content]);

// Test Campaign Generation
const factory = new ContentFactory();
const campaign = await factory.generateCampaign(brief, claimsMap);
```

## Integration with Existing Code

These services integrate with the existing type system:

```typescript
// From types/index.ts
import {
  SiteBrief,
  ClaimsMap,
  Campaign,
  ContentAsset,
  CampaignSpec,
  ComplianceSettings
} from '@/types';
```

Use the `convertToContentAssets()` method to map generated assets to the `ContentAsset` database model for persistence.

## Production Checklist

- [ ] Set ANTHROPIC_API_KEY environment variable
- [ ] Configure database connection for storing ContentAssets
- [ ] Implement caching for frequently ingested sites
- [ ] Add monitoring/logging for API calls
- [ ] Set up error alerting
- [ ] Configure rate limits per organization
- [ ] Implement cost tracking for Claude API usage
- [ ] Add asset preview/approval workflow before publishing
