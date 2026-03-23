import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/utils/mock-db';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Workaround: Turbopack on mounted filesystems may not load .env.local into process.env
// Manually load if the key is missing
function getAnthropicKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const envPaths = ['.env.local', '.env'];
    for (const envFile of envPaths) {
      const envPath = join(process.cwd(), envFile);
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8');
        const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
        if (match?.[1]) {
          process.env.ANTHROPIC_API_KEY = match[1].trim();
          return match[1].trim();
        }
      }
    }
  } catch { /* ignore */ }
  return undefined;
}

export interface IngestRequest {
  url: string;
  canonicalStrategy?: 'enforce' | 'prefer' | 'optional';
  linkPolicy?: 'utm_only' | 'canonical_only' | 'both';
  distributionPacing?: 'immediate' | 'staggered' | 'scheduled';
  customInstructions?: string;
  orgId: string;
}

export interface IngestResponse {
  campaignId: string;
  assetCount: number;
  destinationCount: number;
  status: string;
}

interface ExtractedSiteData {
  title: string;
  description: string;
  bodyText: string;
  offers: string[];
  ctas: string[];
  brandName: string;
  url: string;
  images: string[];
}

/**
 * POST /api/ingest
 * Ingest a URL → fetch real page content → use Claude to generate campaign assets
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: IngestRequest = await request.json();

    if (!body.url || !body.orgId) {
      return NextResponse.json(
        { error: 'Missing required fields: url, orgId' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create campaign in generating state
    const campaign = mockDb.createCampaign({
      orgId: body.orgId,
      sourceUrl: body.url,
      sourceType: 'url_ingest',
      canonicalSiteUrl: parsedUrl.origin,
      status: 'generating',
      utmPolicy: body.linkPolicy || 'utm_only',
    });

    // Step 1: Fetch and extract real content from the URL
    let siteData: ExtractedSiteData;
    try {
      siteData = await fetchAndExtractContent(body.url);
    } catch (err) {
      console.error('Failed to fetch URL:', err);
      // Fallback: use URL metadata only
      siteData = {
        title: parsedUrl.hostname.replace('www.', '').split('.')[0],
        description: `Content from ${parsedUrl.hostname}`,
        bodyText: '',
        offers: [],
        ctas: [],
        brandName: parsedUrl.hostname.replace('www.', '').split('.')[0],
        url: body.url,
        images: [],
      };
    }

    // Step 2: Use Claude to generate platform-specific assets from real site data
    const apiKey = getAnthropicKey();
    let assets: Array<{
      assetType: 'article' | 'press_release' | 'social_snippet' | 'newsletter';
      title: string;
      bodyMarkdown: string;
      excerpt: string;
      tags: string[];
    }>;

    if (apiKey) {
      try {
        assets = await generateAssetsWithClaude(siteData, apiKey, body.customInstructions);
      } catch (err) {
        console.error('Claude generation failed, using smart fallback:', err);
        assets = generateSmartFallbackAssets(siteData, body.customInstructions);
      }
    } else {
      console.warn('No ANTHROPIC_API_KEY set — using smart fallback assets from extracted content');
      assets = generateSmartFallbackAssets(siteData, body.customInstructions);
    }

    // Step 3: Save assets to DB
    let assetCount = 0;
    for (const assetData of assets) {
      mockDb.createAsset({
        campaignId: campaign.id,
        assetType: assetData.assetType,
        title: assetData.title,
        bodyMarkdown: assetData.bodyMarkdown,
        excerpt: assetData.excerpt,
        tags: assetData.tags,
        canonicalUrl: body.url,
        status: 'draft',
        version: 1,
      });
      assetCount++;
    }

    // Update campaign with extracted site brief
    mockDb.updateCampaign(campaign.id, {
      status: 'ready',
      siteBrief: {
        valueProp: siteData.description || `${siteData.brandName} — ${siteData.title}`,
        audienceHypothesis: 'Purpose-driven entrepreneurs and creators',
        objections: [],
        differentiators: siteData.offers.length > 0 ? siteData.offers : [siteData.title],
        primaryCtaUrl: body.url,
        offers: siteData.offers.map((o, i) => ({
          title: o,
          description: o,
          cta: siteData.ctas[i] || 'Learn More',
          url: body.url,
        })),
        brandVoice: {
          tone: 'Professional, inspiring, authentic',
          perspective: 'First person plural',
          keyMessages: [siteData.title, siteData.description].filter(Boolean),
        },
        coreTopics: siteData.offers.length > 0 ? siteData.offers.slice(0, 3) : [siteData.brandName],
      },
      updatedAt: new Date(),
    });

    const destinationCount = 9;

    return NextResponse.json({
      campaignId: campaign.id,
      assetCount,
      destinationCount,
      status: 'success',
    } as IngestResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Fetch a URL and extract meaningful content (title, description, body text, offers, CTAs)
 */
async function fetchAndExtractContent(url: string): Promise<ExtractedSiteData> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DistributePlatform/1.0; +https://distribute.app)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const parsedUrl = new URL(url);

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"\s+(?:property|name)="og:title"/i);
  const title = ogTitleMatch?.[1] || titleMatch?.[1]?.trim() || parsedUrl.hostname;

  // Extract description
  const descMatch = html.match(/<meta\s+(?:name|property)="(?:og:)?description"\s+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"\s+(?:name|property)="(?:og:)?description"/i);
  const description = descMatch?.[1] || '';

  // Extract body text (strip HTML tags, scripts, styles)
  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Limit body text to ~8000 chars for Claude context
  if (bodyText.length > 8000) {
    bodyText = bodyText.substring(0, 8000) + '...';
  }

  // Extract potential offers/pricing (look for $ amounts, pricing sections)
  const offers: string[] = [];
  const offerPatterns = [
    /\$[\d,]+(?:\.\d{2})?(?:\/(?:mo|month|yr|year))?/gi,
    /(?:starting at|from|only|just)\s*\$[\d,]+/gi,
  ];
  for (const pattern of offerPatterns) {
    const matches = bodyText.match(pattern);
    if (matches) {
      offers.push(...matches.slice(0, 5));
    }
  }

  // Extract CTAs
  const ctaPatterns = [
    /(?:Join|Sign Up|Get Started|Learn More|Subscribe|Book|Schedule|Apply|Download|Try Free|Start Now|Register)[^<.!?\n]{0,40}/gi,
  ];
  const ctas: string[] = [];
  for (const pattern of ctaPatterns) {
    const matches = bodyText.match(pattern);
    if (matches) {
      ctas.push(...matches.slice(0, 5).map((m) => m.trim()));
    }
  }

  // Brand name from domain or og:site_name
  const siteNameMatch = html.match(/<meta\s+(?:property|name)="og:site_name"\s+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"\s+(?:property|name)="og:site_name"/i);
  const brandName = siteNameMatch?.[1] || parsedUrl.hostname.replace('www.', '').split('.')[0];

  // Extract images from og:image and <img> tags
  const images: string[] = [];

  // Extract og:image
  const ogImageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
  if (ogImageMatch?.[1]) {
    const ogImageUrl = ogImageMatch[1];
    // Skip data: URIs
    if (!ogImageUrl.startsWith('data:')) {
      images.push(makeAbsoluteUrl(ogImageUrl, parsedUrl));
    }
  }

  // Extract all <img> src URLs (limit to 10 total)
  const imgRegex = /<img[^>]+src="([^"]+)"/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) && images.length < 10) {
    const imgUrl = imgMatch[1];
    // Skip data: URIs
    if (!imgUrl.startsWith('data:')) {
      images.push(makeAbsoluteUrl(imgUrl, parsedUrl));
    }
  }

  // Remove duplicates and limit to 10
  const uniqueImages = [...new Set(images)].slice(0, 10);

  return {
    title,
    description,
    bodyText,
    offers: [...new Set(offers)],
    ctas: [...new Set(ctas)],
    brandName,
    url,
    images: uniqueImages,
  };
}

/**
 * Convert relative URLs to absolute URLs
 */
function makeAbsoluteUrl(url: string, baseUrl: URL): string {
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Protocol-relative
  if (url.startsWith('//')) {
    return `${baseUrl.protocol}${url}`;
  }
  // Root-relative
  if (url.startsWith('/')) {
    return `${baseUrl.origin}${url}`;
  }
  // Relative to current path
  return `${baseUrl.origin}/${url}`;
}

/**
 * Use Claude API to generate 5 platform-specific content assets from real site data
 */
async function generateAssetsWithClaude(
  siteData: ExtractedSiteData,
  apiKey: string,
  customInstructions?: string
): Promise<Array<{
  assetType: 'article' | 'press_release' | 'social_snippet' | 'newsletter';
  title: string;
  bodyMarkdown: string;
  excerpt: string;
  tags: string[];
}>> {
  const systemPrompt = `You are an expert content strategist and copywriter. Given real website data, you generate high-quality, platform-specific marketing content that accurately reflects the brand, its offers, and its voice.

CRITICAL RULES:
- ALL content must be directly derived from the actual website data provided
- Use real product names, real pricing, real features, real CTAs from the site
- Do NOT invent features, pricing, or claims not present in the source data
- Sound natural, engaging, and human — not AI-generated
- Each piece must be ready to publish on its target platform

Output ONLY valid JSON. No markdown fences, no commentary.`;

  const userPrompt = `Here is the extracted data from ${siteData.url}:

BRAND: ${siteData.brandName}
TITLE: ${siteData.title}
DESCRIPTION: ${siteData.description}
OFFERS/PRICING FOUND: ${siteData.offers.length > 0 ? siteData.offers.join(', ') : 'None explicitly listed'}
CTAs FOUND: ${siteData.ctas.length > 0 ? siteData.ctas.join(', ') : 'None explicitly found'}
IMAGES AVAILABLE: ${siteData.images.length > 0 ? siteData.images.join(', ') : 'None found'}

PAGE CONTENT (extracted text):
${siteData.bodyText.substring(0, 6000)}

---

Generate exactly 5 content assets as a JSON array. Each asset must be an object with these fields:
- "assetType": one of "article", "press_release", "social_snippet", "newsletter"
- "title": compelling title for that platform
- "bodyMarkdown": the full content in Markdown format
- "excerpt": 1-2 sentence summary
- "tags": array of 3-5 relevant tags

Generate these 5 specific pieces:

1. **article** — A 600-800 word blog post / long-form article about ${siteData.brandName} and what they offer. Include real details from the site. Use H2 headings, bullet points, and a CTA linking to ${siteData.url}.

2. **social_snippet** — A punchy LinkedIn post (under 2500 chars). Hook in first 2 lines. Use line breaks. Include relevant hashtags. Reference real offers/features from the site.

3. **social_snippet** — A short-form social post for Twitter/X and Mastodon (under 280 chars). Punchy, direct, with a link to ${siteData.url}.

4. **press_release** — AP-style press release announcing ${siteData.brandName}. Real details, real features, dateline format, boilerplate paragraph.

5. **newsletter** — Email newsletter body promoting ${siteData.brandName}. Personal tone, value-first, clear CTA, formatted for email readability.

Return ONLY the JSON array.${customInstructions ? `

---

ADDITIONAL INSTRUCTIONS FROM USER:
${customInstructions}` : ''}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', errorText);
    throw new Error(`Claude API returned ${response.status}`);
  }

  const result = await response.json();
  const rawText = result.content?.[0]?.text || '';

  // Parse JSON from Claude's response (handle potential markdown fences)
  let cleanJson = rawText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanJson);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Claude returned invalid asset array');
  }

  // Validate and normalize each asset
  return parsed.map((asset: any) => ({
    assetType: ['article', 'press_release', 'social_snippet', 'newsletter'].includes(asset.assetType)
      ? asset.assetType
      : 'article',
    title: String(asset.title || 'Untitled'),
    bodyMarkdown: String(asset.bodyMarkdown || asset.body || ''),
    excerpt: String(asset.excerpt || asset.summary || ''),
    tags: Array.isArray(asset.tags) ? asset.tags.map(String) : [],
  }));
}

/**
 * Smart fallback: generate assets using extracted site data WITHOUT Claude API
 * Still uses real content from the site, just templated instead of AI-written
 */
function generateSmartFallbackAssets(siteData: ExtractedSiteData, customInstructions?: string) {
  const brand = siteData.brandName.charAt(0).toUpperCase() + siteData.brandName.slice(1);
  const desc = siteData.description || `Discover what ${brand} has to offer`;
  const offersText = siteData.offers.length > 0
    ? siteData.offers.map((o) => `- ${o}`).join('\n')
    : '- Visit the site for current offers';
  const ctaText = siteData.ctas[0] || 'Learn More';

  return [
    {
      assetType: 'article' as const,
      title: `${siteData.title} — Everything You Need to Know About ${brand}`,
      bodyMarkdown: `${siteData.images[0] ? `![${brand}](${siteData.images[0]})\n\n` : ''}# ${siteData.title}

${desc}

## What is ${brand}?

${siteData.bodyText.substring(0, 1200) || `${brand} is a platform dedicated to helping people achieve their goals.`}

## Key Offerings

${offersText}

## Why It Matters

${brand} stands out by delivering real value to its community. Whether you're just getting started or looking to level up, there's something here for everyone.

## Get Started

Ready to dive in? [${ctaText}](${siteData.url})

---

*This content was generated from [${brand}](${siteData.url})*`,
      excerpt: desc,
      tags: [brand.toLowerCase(), 'community', 'growth', 'opportunity'],
    },
    {
      assetType: 'social_snippet' as const,
      title: `${brand} — LinkedIn Post`,
      bodyMarkdown: `${siteData.title}

${desc}

${siteData.bodyText.substring(0, 400)}

${siteData.offers.length > 0 ? `\nCurrent offers:\n${offersText}\n` : ''}
👉 ${siteData.url}

#${brand.replace(/\s+/g, '')} #entrepreneur #community #growth`,
      excerpt: `LinkedIn post promoting ${brand}`,
      tags: [brand.toLowerCase(), 'linkedin', 'social'],
    },
    {
      assetType: 'social_snippet' as const,
      title: `${brand} — Short Social Post`,
      bodyMarkdown: `${desc.substring(0, 200)} 🚀\n\n${siteData.url}`,
      excerpt: `Short social post for ${brand}`,
      tags: [brand.toLowerCase(), 'twitter', 'social'],
    },
    {
      assetType: 'press_release' as const,
      title: `${brand} Launches to Empower Entrepreneurs`,
      bodyMarkdown: `FOR IMMEDIATE RELEASE

**${brand} Launches to Empower Entrepreneurs and Creators**

*${desc}*

**${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}** — ${brand} today announced its platform designed to help entrepreneurs and creators build transformative businesses.

${siteData.bodyText.substring(0, 800)}

${siteData.offers.length > 0 ? `## Pricing & Offers\n\n${offersText}\n` : ''}

## About ${brand}

${desc}. For more information, visit [${siteData.url}](${siteData.url}).

**Contact:**
info@${new URL(siteData.url).hostname}
${siteData.url}`,
      excerpt: `Press release announcing ${brand}`,
      tags: [brand.toLowerCase(), 'press', 'announcement', 'launch'],
    },
    {
      assetType: 'newsletter' as const,
      title: `Discover ${brand} — Your Next Big Move`,
      bodyMarkdown: `Hey there,

I wanted to share something that I think you'll love.

**${siteData.title}**

${desc}

${siteData.bodyText.substring(0, 600)}

${siteData.offers.length > 0 ? `### What's Available:\n\n${offersText}\n` : ''}

**Ready to take action?**

[${ctaText} →](${siteData.url})

Talk soon,
The ${brand} Team`,
      excerpt: `Newsletter promoting ${brand}`,
      tags: [brand.toLowerCase(), 'newsletter', 'email'],
    },
  ];
}
