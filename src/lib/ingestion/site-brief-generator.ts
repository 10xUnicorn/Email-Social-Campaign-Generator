import Anthropic from '@anthropic-ai/sdk';
import { SiteBrief, BrandVoice, Claim, ClaimsMap } from '../../types';
import { PageContent } from './html-extractor';
import { OffersData } from './offer-extractor';

interface BriefResponse {
  valueProp: string;
  audienceHypothesis: string;
  objections: string[];
  differentiators: string[];
  primaryCtaUrl: string;
  brandVoice: BrandVoice;
  coreTopics: string[];
}

interface ClaimsMapResponse {
  claims: Array<{
    text: string;
    source: string;
    verified: boolean;
  }>;
}

const BRIEF_SYSTEM_PROMPT = `You are a strategic business analyst specializing in understanding company value propositions and market positioning.

Analyze the provided website content to generate a comprehensive site brief that captures:
1. **Value Proposition**: The core benefit/promise to customers
2. **Audience Hypothesis**: Who this company is trying to reach
3. **Objections**: Common customer objections or barriers to conversion
4. **Differentiators**: What makes this company unique vs competitors
5. **Primary CTA URL**: The main call-to-action URL for conversions
6. **Brand Voice**: Tone, perspective, vocabulary, and key messages
7. **Core Topics**: 5-7 main topics the company focuses on

Return response as valid JSON. Be specific and extract real information from the content, not generic observations.`;

const CLAIMS_SYSTEM_PROMPT = `You are a fact-checker and claims analyst specializing in extracting verifiable business claims from website content.

Analyze the provided website content and extract all factual claims that could be used in marketing content. For each claim:
1. Extract the exact claim text
2. Identify the source page
3. Mark as verified if you can confirm it's factual, false if it appears unverifiable

Look for:
- Performance metrics and results
- Feature claims
- Comparative statements
- Customer outcomes
- Certifications and credentials
- Money-back guarantees
- Specific product capabilities

Return response as valid JSON.`;

export class SiteBriefGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async generateBrief(
    pages: PageContent[],
    offers: OffersData
  ): Promise<{ brief: SiteBrief; claimsMap: ClaimsMap }> {
    const combinedContent = this.prepareContent(pages, offers);

    // Generate brief
    const briefResponse = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: BRIEF_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a strategic site brief for this company:\n\n${combinedContent}`,
        },
      ],
    });

    const briefText =
      briefResponse.content[0].type === 'text'
        ? briefResponse.content[0].text
        : '{}';
    const briefData = this.parseBriefResponse(briefText);

    // Generate claims map
    const claimsResponse = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: CLAIMS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract all factual claims from this website content:\n\n${combinedContent}`,
        },
      ],
    });

    const claimsText =
      claimsResponse.content[0].type === 'text'
        ? claimsResponse.content[0].text
        : '{}';
    const claimsMap = this.parseClaimsResponse(claimsText);

    const brief: SiteBrief = {
      valueProp: briefData.valueProp,
      audienceHypothesis: briefData.audienceHypothesis,
      objections: briefData.objections,
      differentiators: briefData.differentiators,
      primaryCtaUrl: briefData.primaryCtaUrl,
      offers: offers.offers.map((offer) => ({
        title: offer.name,
        description: offer.description,
        cta: offer.cta,
        url: offer.ctaUrl || briefData.primaryCtaUrl,
      })),
      brandVoice: briefData.brandVoice,
      coreTopics: briefData.coreTopics,
    };

    return { brief, claimsMap };
  }

  private prepareContent(pages: PageContent[], offers: OffersData): string {
    const pagesContent = pages
      .slice(0, 10) // Use top 10 pages
      .map(
        (page) =>
          `URL: ${page.url}\nTITLE: ${page.title}\nDESCRIPTION: ${page.description}\n\nCONTENT:\n${page.bodyText.substring(0, 2000)}\n\nHEADINGS:\n${page.headings.map((h) => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}`
      )
      .join('\n\n---\n\n');

    const offersContent = `\nOFFERS AND PRICING:\n${offers.offers
      .map((o) => `- ${o.name}: ${o.description} (${o.price || 'Price on request'})`)
      .join('\n')}\n\nVALUE PROPOSITIONS:\n${offers.valuePropositions.map((v) => `- ${v}`).join('\n')}\n\nSOCIAL PROOF:\n${offers.socialProof
      .slice(0, 5)
      .map((sp) => `- ${sp.type}: ${sp.text}`)
      .join('\n')}`;

    return `${pagesContent}\n${offersContent}`;
  }

  private parseBriefResponse(responseText: string): BriefResponse {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeBriefResponse(parsed);
      }
    } catch (error) {
      console.error('Failed to parse brief response:', error);
    }

    return {
      valueProp: 'Unknown value proposition',
      audienceHypothesis: 'Business customers',
      objections: [],
      differentiators: [],
      primaryCtaUrl: '/',
      brandVoice: {
        tone: 'professional',
      },
      coreTopics: [],
    };
  }

  private normalizeBriefResponse(data: any): BriefResponse {
    return {
      valueProp: String(data.valueProp || 'Unknown value proposition'),
      audienceHypothesis: String(
        data.audienceHypothesis || 'Business customers'
      ),
      objections: Array.isArray(data.objections)
        ? data.objections.map(String)
        : [],
      differentiators: Array.isArray(data.differentiators)
        ? data.differentiators.map(String)
        : [],
      primaryCtaUrl: String(data.primaryCtaUrl || '/'),
      brandVoice: {
        tone: data.brandVoice?.tone
          ? String(data.brandVoice.tone)
          : 'professional',
        perspective: data.brandVoice?.perspective
          ? String(data.brandVoice.perspective)
          : undefined,
        vocabulary: data.brandVoice?.vocabulary
          ? String(data.brandVoice.vocabulary)
          : undefined,
        keyMessages: Array.isArray(data.brandVoice?.keyMessages)
          ? data.brandVoice.keyMessages.map(String)
          : undefined,
      },
      coreTopics: Array.isArray(data.coreTopics)
        ? data.coreTopics.map(String)
        : [],
    };
  }

  private parseClaimsResponse(responseText: string): ClaimsMap {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const claims: Claim[] = (parsed.claims || []).map((claim: any) => ({
          text: String(claim.text || ''),
          source: claim.source ? String(claim.source) : undefined,
          verified: Boolean(claim.verified),
        }));
        return { claims };
      }
    } catch (error) {
      console.error('Failed to parse claims response:', error);
    }

    return { claims: [] };
  }
}
