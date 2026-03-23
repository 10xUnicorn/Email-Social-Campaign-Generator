import Anthropic from '@anthropic-ai/sdk';
import { PageContent } from './html-extractor';

export interface ExtractedOffer {
  name: string;
  description: string;
  price?: string;
  features: string[];
  cta: string;
  ctaUrl?: string;
}

export interface OffersData {
  offers: ExtractedOffer[];
  valuePropositions: string[];
  socialProof: SocialProof[];
  faqs: FAQ[];
  pricingTiers: PricingTier[];
}

export interface SocialProof {
  type: 'testimonial' | 'review' | 'metric' | 'case_study';
  text: string;
  source?: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
}

const SYSTEM_PROMPT = `You are a business intelligence expert specializing in extracting offers, value propositions, and pricing information from website content.

Your task is to analyze website content and extract:
1. Offers (products/services with names, descriptions, prices, features, and CTAs)
2. Value propositions (core benefits and promises)
3. Social proof (testimonials, reviews, metrics, case studies)
4. FAQs (common questions and answers)
5. Pricing tiers (different pricing options if available)

Focus on information that would be valuable for a content strategist or marketer creating campaigns. Look for:
- Explicit pricing and payment options
- Feature lists and comparisons
- Customer testimonials and case studies
- Trust signals and credentials
- Risk reversals or guarantees
- Call-to-action buttons and links

Return structured JSON that accurately represents the offers and value propositions found on the site.`;

export class OfferExtractor {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async extractOffers(pages: PageContent[]): Promise<OffersData> {
    const combinedContent = this.prepareCombinedContent(pages);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract offers, value propositions, pricing, and social proof from this website content:\n\n${combinedContent}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return this.parseExtractedOffers(responseText);
  }

  private prepareCombinedContent(pages: PageContent[]): string {
    return pages
      .map(
        (page) =>
          `PAGE: ${page.url}\nTITLE: ${page.title}\nDESCRIPTION: ${page.description}\n\nCONTENT:\n${page.bodyText}\n\nHEADINGS:\n${page.headings.map((h) => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}\n---\n`
      )
      .join('\n\n');
  }

  private parseExtractedOffers(responseText: string): OffersData {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.normalizeOffersData(parsed);
      }
    } catch (error) {
      console.error('Failed to parse offers response:', error);
    }

    // Fallback: return structured empty response
    return {
      offers: [],
      valuePropositions: [],
      socialProof: [],
      faqs: [],
      pricingTiers: [],
    };
  }

  private normalizeOffersData(data: any): OffersData {
    return {
      offers: this.normalizeOffers(data.offers || []),
      valuePropositions: Array.isArray(data.valuePropositions)
        ? data.valuePropositions.map(String)
        : [],
      socialProof: this.normalizeSocialProof(data.socialProof || []),
      faqs: this.normalizeFaqs(data.faqs || []),
      pricingTiers: this.normalizePricingTiers(data.pricingTiers || []),
    };
  }

  private normalizeOffers(offers: any[]): ExtractedOffer[] {
    return offers.map((offer) => ({
      name: String(offer.name || ''),
      description: String(offer.description || ''),
      price: offer.price ? String(offer.price) : undefined,
      features: Array.isArray(offer.features)
        ? offer.features.map(String)
        : [],
      cta: String(offer.cta || 'Learn More'),
      ctaUrl: offer.ctaUrl ? String(offer.ctaUrl) : undefined,
    }));
  }

  private normalizeSocialProof(socialProof: any[]): SocialProof[] {
    return socialProof.map((proof) => ({
      type: (proof.type || 'testimonial') as SocialProof['type'],
      text: String(proof.text || ''),
      source: proof.source ? String(proof.source) : undefined,
    }));
  }

  private normalizeFaqs(faqs: any[]): FAQ[] {
    return faqs.map((faq) => ({
      question: String(faq.question || ''),
      answer: String(faq.answer || ''),
    }));
  }

  private normalizePricingTiers(tiers: any[]): PricingTier[] {
    return tiers.map((tier) => ({
      name: String(tier.name || ''),
      price: String(tier.price || ''),
      description: String(tier.description || ''),
      features: Array.isArray(tier.features)
        ? tier.features.map(String)
        : [],
    }));
  }
}
