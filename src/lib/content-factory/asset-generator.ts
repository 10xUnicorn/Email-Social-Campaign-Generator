import Anthropic from '@anthropic-ai/sdk';
import { SiteBrief, CampaignSpec, Pillar } from '@/types';
import { AssetVariant } from './index';

export interface GeneratedAsset {
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  variants?: AssetVariant[];
}

export interface ArticleAsset extends GeneratedAsset {
  type: 'article';
  excerpt: string;
  tags: string[];
  titleOptions: string[];
  cta?: string;
}

export interface SocialSnippet extends GeneratedAsset {
  type: 'social';
  shortForm: string;
  longForm: string;
  hashtags: string[];
  platform?: string;
}

export interface VideoScript extends GeneratedAsset {
  type: 'video';
  script: string;
  youtubeTags: string[];
  youtubeTitle: string;
  youtubeDescription: string;
  duration: number;
}

export interface PodcastScript extends GeneratedAsset {
  type: 'podcast';
  script: string;
  rssDescription: string;
  rssKeywords: string[];
  episodeNumber?: number;
}

export class AssetGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async generateArticle(
    spec: CampaignSpec,
    pillar: Pillar,
    brief: SiteBrief
  ): Promise<ArticleAsset> {
    const systemPrompt = `You are an expert content writer specializing in long-form articles that drive business results.

Create a compelling article (1500-2000 words) that:
1. Addresses the pillar topic and key messages
2. Provides real value to the target audience
3. Includes data, examples, or stories
4. Subtly guides toward the CTA
5. Maintains the brand voice throughout

Return as JSON with:
- titleOptions: array of 5 different title options
- excerpt: 100-150 word summary
- content: full article in markdown
- tags: 5-10 relevant tags
- cta: call-to-action text
- ctaUrl: link for the CTA`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write an article for this pillar:

PILLAR: ${pillar.title}
DESCRIPTION: ${pillar.description}
KEY MESSAGES: ${pillar.keyMessages.join(', ')}

TARGET AUDIENCE: ${brief.audienceHypothesis}
VALUE PROPOSITION: ${brief.valueProp}
BRAND VOICE: ${JSON.stringify(brief.brandVoice, null, 2)}
PRIMARY CTA: ${brief.primaryCtaUrl}

Create compelling, valuable content that naturally incorporates the brand voice and guides readers toward the CTA.`,
        },
      ],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    return this.parseArticleResponse(content, pillar);
  }

  async generatePressRelease(spec: CampaignSpec, brief: SiteBrief): Promise<GeneratedAsset> {
    const systemPrompt = `You are an expert PR writer who creates newsworthy press releases that get picked up by media.

Create a professional press release (300-500 words) that:
1. Leads with news, not advertising
2. Uses AP style and journalistic tone
3. Includes quotes from a company representative
4. Provides context and significance
5. Includes boilerplate company info at the end
6. Has a clear call-to-action for journalists

Return as JSON with:
- title: headline
- content: full press release in markdown
- tags: media keywords
- dateIssued: ISO date string`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write a press release for:

VALUE PROPOSITION: ${brief.valueProp}
DIFFERENTIATORS: ${brief.differentiators.join(', ')}
TARGET AUDIENCE: ${brief.audienceHypothesis}
CORE TOPICS: ${brief.coreTopics.join(', ')}

Create a newsworthy press release that journalists would want to cover.`,
        },
      ],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    return this.parsePressReleaseResponse(content);
  }

  async generateNewsletter(spec: CampaignSpec, brief: SiteBrief): Promise<GeneratedAsset> {
    const systemPrompt = `You are an expert newsletter writer who creates engaging, readable email content.

Create a newsletter issue (400-600 words) that:
1. Opens with a compelling hook
2. Includes 2-3 short sections with distinct topics
3. Uses conversational tone
4. Includes a primary and secondary CTA
5. Ends with a signature and social links
6. Has an engaging subject line

Return as JSON with:
- title: newsletter subject line
- content: full newsletter in markdown
- cta: primary call-to-action
- ctaUrl: URL for primary CTA`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write a newsletter for:

VALUE PROPOSITION: ${brief.valueProp}
BRAND VOICE: ${JSON.stringify(brief.brandVoice, null, 2)}
CORE TOPICS: ${brief.coreTopics.slice(0, 3).join(', ')}
TARGET AUDIENCE: ${brief.audienceHypothesis}

Create engaging newsletter content that keeps readers interested and drives them to take action.`,
        },
      ],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    return this.parseNewsletterResponse(content);
  }

  async generateSocialSnippets(
    spec: CampaignSpec,
    brief: SiteBrief,
    count: number = 10
  ): Promise<SocialSnippet[]> {
    const systemPrompt = `You are an expert social media strategist who creates viral-worthy content snippets.

Create ${count} social media snippets that:
1. Work across platforms (Twitter, LinkedIn, Instagram)
2. Include short and long form versions
3. Use compelling language and hooks
4. Include relevant hashtags
5. Have clear calls-to-action
6. Vary in tone and approach

Return as JSON array with:
- shortForm: tweet-length version (280 chars max)
- longForm: expanded version for LinkedIn (1500 chars max)
- hashtags: 3-5 relevant hashtags
- platform: optimal platform ('twitter', 'linkedin', 'instagram', or 'multi')`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Create ${count} social snippets for:

VALUE PROPOSITION: ${brief.valueProp}
BRAND VOICE: ${JSON.stringify(brief.brandVoice, null, 2)}
DIFFERENTIATORS: ${brief.differentiators.slice(0, 3).join(', ')}
TARGET AUDIENCE: ${brief.audienceHypothesis}
CTA URL: ${brief.primaryCtaUrl}

Create diverse, engaging snippets that resonate with the audience and drive engagement.`,
        },
      ],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '[]';
    return this.parseSocialSnippetsResponse(content);
  }

  async generateVideoScript(spec: CampaignSpec, brief: SiteBrief): Promise<VideoScript> {
    const systemPrompt = `You are an expert video scriptwriter who creates engaging, concise video scripts.

Create a video script (2-3 minutes, ~400-500 words) that:
1. Opens with a hook in first 3 seconds
2. Delivers value quickly and clearly
3. Uses conversational, natural language
4. Includes visual directions in brackets
5. Ends with a clear call-to-action
6. Is optimized for YouTube

Return as JSON with:
- script: full video script in markdown
- duration: estimated duration in seconds
- youtubeTitle: optimized YouTube title (50-60 chars)
- youtubeDescription: YouTube video description (200-300 chars)
- youtubeTags: 8-10 relevant tags`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write a video script for:

VALUE PROPOSITION: ${brief.valueProp}
BRAND VOICE: ${JSON.stringify(brief.brandVoice, null, 2)}
DIFFERENTIATORS: ${brief.differentiators.slice(0, 2).join(', ')}
TARGET AUDIENCE: ${brief.audienceHypothesis}

Create engaging video content that educates and converts.`,
        },
      ],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    return this.parseVideoScriptResponse(content);
  }

  async generatePodcastScript(spec: CampaignSpec, brief: SiteBrief): Promise<PodcastScript> {
    const systemPrompt = `You are an expert podcast scriptwriter who creates engaging audio content.

Create a podcast episode script (20-30 minutes, ~2500-3500 words) that:
1. Starts with an engaging intro
2. Includes a personal story or relatable example
3. Provides actionable insights
4. Uses conversational, interview-style language
5. Includes natural transitions between topics
6. Ends with a clear call-to-action

Return as JSON with:
- script: full podcast script in markdown
- rssDescription: RSS feed description (150-200 chars)
- rssKeywords: 5-10 podcast keywords
- episodeNumber: episode number (use 1)`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write a podcast episode script for:

VALUE PROPOSITION: ${brief.valueProp}
BRAND VOICE: ${JSON.stringify(brief.brandVoice, null, 2)}
CORE TOPICS: ${brief.coreTopics.slice(0, 3).join(', ')}
TARGET AUDIENCE: ${brief.audienceHypothesis}

Create engaging podcast content that educates listeners and drives action.`,
        },
      ],
    });

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '{}';
    return this.parsePodcastScriptResponse(content);
  }

  // Response parsers
  private parseArticleResponse(responseText: string, pillar: Pillar): ArticleAsset {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'article',
          title: parsed.titleOptions?.[0] || pillar.title,
          titleOptions: Array.isArray(parsed.titleOptions)
            ? parsed.titleOptions.map(String)
            : [pillar.title],
          excerpt: String(parsed.excerpt || ''),
          content: String(parsed.content || ''),
          tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
          cta: String(parsed.cta || 'Learn More'),
          metadata: {
            pillarTitle: pillar.title,
          },
        };
      }
    } catch (error) {
      console.error('Failed to parse article response:', error);
    }

    return {
      type: 'article',
      title: pillar.title,
      titleOptions: [pillar.title],
      excerpt: pillar.description,
      content: pillar.description,
      tags: [],
      cta: 'Learn More',
    };
  }

  private parsePressReleaseResponse(responseText: string): GeneratedAsset {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'press_release',
          title: String(parsed.title || 'Press Release'),
          content: String(parsed.content || ''),
          metadata: {
            tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
            dateIssued: parsed.dateIssued || new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      console.error('Failed to parse press release response:', error);
    }

    return {
      type: 'press_release',
      title: 'Press Release',
      content: '',
    };
  }

  private parseNewsletterResponse(responseText: string): GeneratedAsset {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'newsletter',
          title: String(parsed.title || 'Newsletter'),
          content: String(parsed.content || ''),
          metadata: {
            cta: parsed.cta,
            ctaUrl: parsed.ctaUrl,
          },
        };
      }
    } catch (error) {
      console.error('Failed to parse newsletter response:', error);
    }

    return {
      type: 'newsletter',
      title: 'Newsletter',
      content: '',
    };
  }

  private parseSocialSnippetsResponse(responseText: string): SocialSnippet[] {
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed)
          ? parsed.map((snippet: any) => ({
              type: 'social',
              title: `Social Snippet - ${snippet.platform || 'Multi'}`,
              content: String(snippet.shortForm || ''),
              shortForm: String(snippet.shortForm || ''),
              longForm: String(snippet.longForm || ''),
              hashtags: Array.isArray(snippet.hashtags)
                ? snippet.hashtags.map(String)
                : [],
              platform: snippet.platform || 'multi',
            }))
          : [];
      }
    } catch (error) {
      console.error('Failed to parse social snippets response:', error);
    }

    return [];
  }

  private parseVideoScriptResponse(responseText: string): VideoScript {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'video',
          title: String(parsed.youtubeTitle || 'Video Script'),
          script: String(parsed.script || ''),
          content: String(parsed.script || ''),
          duration: parseInt(parsed.duration) || 180,
          youtubeTitle: String(parsed.youtubeTitle || ''),
          youtubeDescription: String(parsed.youtubeDescription || ''),
          youtubeTags: Array.isArray(parsed.youtubeTags)
            ? parsed.youtubeTags.map(String)
            : [],
        };
      }
    } catch (error) {
      console.error('Failed to parse video script response:', error);
    }

    return {
      type: 'video',
      title: 'Video Script',
      script: '',
      content: '',
      duration: 180,
      youtubeTitle: '',
      youtubeDescription: '',
      youtubeTags: [],
    };
  }

  private parsePodcastScriptResponse(responseText: string): PodcastScript {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: 'podcast',
          title: 'Podcast Episode',
          script: String(parsed.script || ''),
          content: String(parsed.script || ''),
          rssDescription: String(parsed.rssDescription || ''),
          rssKeywords: Array.isArray(parsed.rssKeywords)
            ? parsed.rssKeywords.map(String)
            : [],
          episodeNumber: parsed.episodeNumber || 1,
        };
      }
    } catch (error) {
      console.error('Failed to parse podcast script response:', error);
    }

    return {
      type: 'podcast',
      title: 'Podcast Episode',
      script: '',
      content: '',
      rssDescription: '',
      rssKeywords: [],
    };
  }
}
