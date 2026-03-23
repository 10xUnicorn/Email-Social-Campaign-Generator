import Anthropic from '@anthropic-ai/sdk';
import { SiteBrief } from '@/types';

export interface RewriteResult {
  original: string;
  rewrite: string;
  uniquenessScore: number;
  platform: string;
}

const REWRITE_SYSTEM_PROMPT = `You are an expert content rewriter who adapts content for different platforms and destinations while maintaining core messaging.

For each destination, you will:
1. Adapt tone and style to match the platform's audience and format
2. Adjust length and structure for optimal platform performance
3. Maintain core claims and CTAs from the original
4. Add platform-specific best practices and formatting
5. Ensure minimum 40% content uniqueness (avoid direct copying)

Common destination rewrites:
- LinkedIn: Professional, data-driven, personal narrative style, 1300-1500 words
- Medium: Storytelling, accessible writing, bold claims, 1000-1300 words
- Twitter: Punchy, hook-first, multiple tweets or threads, max 280 chars each
- Email: Conversational, benefit-focused, clear CTA, 300-500 words
- Blog: In-depth, SEO-optimized, headers and lists, 1500-2000 words
- Press: Journalistic, news-first, quotes, 300-500 words

Return content that reads naturally for the platform, not like a direct copy.`;

const UNIQUENESS_SYSTEM_PROMPT = `You are a content analyst who measures similarity between two texts using linguistic analysis.

Compare the original and rewritten content and provide a uniqueness score from 0-100:
- 0-20: Nearly identical (mostly copied)
- 20-40: Heavily similar (heavy paraphrasing)
- 40-60: Moderately similar (same topic, different approach)
- 60-80: Substantially different (new angles, examples, structure)
- 80-100: Highly unique (completely new framing or approach)

Return JSON with:
- score: 0-100 uniqueness score
- explanation: brief explanation of differences`;

export class Rewriter {
  private client: Anthropic;
  private minUniquenessScore = 40; // Minimum acceptable uniqueness

  constructor(minUniquenessScore: number = 40) {
    this.client = new Anthropic();
    this.minUniquenessScore = minUniquenessScore;
  }

  async rewriteForDestination(
    content: string,
    destinationKey: string,
    brief: SiteBrief,
    maxRetries: number = 3
  ): Promise<RewriteResult> {
    const destinationGuidance = this.getDestinationGuidance(destinationKey);
    let lastResult: RewriteResult | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const rewriteResponse = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: REWRITE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Rewrite this content for ${destinationKey}:

${destinationGuidance}

ORIGINAL CONTENT:
${content}

BRAND VOICE: ${JSON.stringify(brief.brandVoice, null, 2)}
PRIMARY CTA: ${brief.primaryCtaUrl}
TARGET AUDIENCE: ${brief.audienceHypothesis}

${
  attempt > 0
    ? `PREVIOUS ATTEMPT WAS TOO SIMILAR. Make it more substantially different - use new examples, different structure, alternative angles. Minimum 40% unique content.`
    : ''
}

Rewrite the content optimized for ${destinationKey}. Return the rewritten content.`,
          },
        ],
      });

      const rewriteText =
        rewriteResponse.content[0].type === 'text'
          ? rewriteResponse.content[0].text
          : '';

      // Calculate uniqueness score
      const uniquenessScore = await this.computeUniquenessScore(
        content,
        rewriteText
      );

      lastResult = {
        original: content,
        rewrite: rewriteText,
        uniquenessScore,
        platform: destinationKey,
      };

      // If uniqueness is acceptable, return
      if (uniquenessScore >= this.minUniquenessScore) {
        return lastResult;
      }

      // Otherwise, retry with stronger guidance
      if (attempt < maxRetries - 1) {
        await this.delay(500);
      }
    }

    // Return last result even if uniqueness is below threshold
    return lastResult || this.createMinimalRewrite(content, destinationKey);
  }

  private async computeUniquenessScore(
    original: string,
    rewrite: string
  ): Promise<number> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: UNIQUENESS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Compare these texts for uniqueness:

ORIGINAL:
${original}

REWRITTEN:
${rewrite}

Provide a uniqueness score 0-100 where 100 is completely unique and 0 is identical.`,
          },
        ],
      });

      const responseText =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return Math.min(Math.max(parseInt(parsed.score) || 50, 0), 100);
        }
      } catch {
        // Fall back to simple calculation
      }

      // Simple fallback: calculate token overlap
      return this.simpleUniquenessScore(original, rewrite);
    } catch (error) {
      console.error('Error computing uniqueness score:', error);
      return this.simpleUniquenessScore(original, rewrite);
    }
  }

  private simpleUniquenessScore(original: string, rewrite: string): number {
    // Extract words and calculate Jaccard similarity
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const rewriteWords = new Set(rewrite.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...originalWords].filter((x) => rewriteWords.has(x))
    );
    const union = new Set([...originalWords, ...rewriteWords]);

    const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 1;
    const uniquenessScore = Math.round((1 - jaccardSimilarity) * 100);

    return Math.min(Math.max(uniquenessScore, 0), 100);
  }

  private getDestinationGuidance(destination: string): string {
    const guidance: Record<string, string> = {
      linkedin:
        'Optimize for LinkedIn professional audience. Use data and statistics. Include personal perspective. Aim for 1300-1500 words. Use headers and formatting. Include engagement hooks.',
      medium:
        'Write for Medium audience with storytelling approach. Use bold claims and personal insights. Aim for 1000-1300 words. Use subheadings and block quotes. Lead with the most interesting insight.',
      twitter:
        'Create Twitter-friendly content. If long, write as thread (max 280 chars per tweet). Use punchy language and questions. Add hashtags naturally.',
      email:
        'Write for email subscribers. Use conversational tone. Keep to 300-500 words. Start with benefit hook. Clear single CTA. Personalize when possible.',
      blog:
        'Optimize for blog readers. Include SEO keywords naturally. Use h2/h3 headers for structure. Add lists and bullet points. Aim for 1500-2000 words. Include intro and conclusion.',
      'press-release':
        'Write in journalistic style. Lead with news, not advertising. Include quote from company representative. Aim for 300-500 words. Include boilerplate at end.',
      reddit:
        'Write for Reddit community. Use casual, authentic tone. Be helpful and conversational. Acknowledge the subreddit culture. Avoid obvious self-promotion.',
      quora:
        'Answer in Q&A style. Be authoritative but helpful. Include specific examples. Address common follow-up questions. Keep to 300-800 words.',
      facebook:
        'Write for Facebook audience. Use casual, friendly tone. Include emoji if appropriate. Write shorter paragraphs. Encourage shares and comments.',
    };

    return (
      guidance[destination] ||
      `Optimize for ${destination} platform. Adapt tone and format appropriately.`
    );
  }

  private createMinimalRewrite(original: string, destination: string): RewriteResult {
    // If rewriting completely fails, return slightly modified version
    const guidance = this.getDestinationGuidance(destination);
    const minimalRewrite = `${original}\n\n---\n\n[Optimized for ${destination}]\n\nFor more information and to learn how this applies to your specific needs on ${destination}, please visit our platform.`;

    return {
      original,
      rewrite: minimalRewrite,
      uniquenessScore: 25,
      platform: destination,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
