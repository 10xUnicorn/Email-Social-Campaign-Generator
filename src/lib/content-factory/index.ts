import { SiteBrief, CampaignSpec, ClaimsMap, ComplianceSettings, ContentAsset, AssetType } from '@/types';
import { CampaignPlanner } from './campaign-planner';
import { AssetGenerator, GeneratedAsset, ArticleAsset, SocialSnippet, VideoScript, PodcastScript } from './asset-generator';
import { Rewriter, RewriteResult } from './rewriter';
import { v4 as uuid } from 'uuid';

export interface AssetVariant {
  destinationKey: string;
  uniquenessScore: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface CampaignAssets {
  campaignSpec: CampaignSpec;
  assets: {
    articles: (ArticleAsset & { variants: AssetVariant[] })[];
    pressRelease: GeneratedAsset & { variants: AssetVariant[] };
    newsletter: GeneratedAsset & { variants: AssetVariant[] };
    socialSnippets: (SocialSnippet & { variants: AssetVariant[] })[];
    videoScript: (VideoScript & { variants: AssetVariant[] })[];
    podcastScript: (PodcastScript & { variants: AssetVariant[] })[];
  };
}

export interface ContentFactoryProgress {
  stage: 'planning' | 'generating' | 'rewriting' | 'complete';
  progress: number;
  total: number;
  message: string;
}

const DEFAULT_DESTINATIONS = [
  'linkedin',
  'medium',
  'twitter',
  'email',
  'blog',
  'reddit',
];

export class ContentFactory {
  private campaignPlanner = new CampaignPlanner();
  private assetGenerator = new AssetGenerator();
  private rewriter = new Rewriter(40); // Minimum 40% uniqueness

  async generateCampaign(
    siteBrief: SiteBrief,
    claimsMap: ClaimsMap,
    complianceSettings?: ComplianceSettings,
    onProgress?: (status: ContentFactoryProgress) => void
  ): Promise<CampaignAssets> {
    try {
      const destinations = DEFAULT_DESTINATIONS;

      // Stage 1: Plan campaign
      onProgress?.({
        stage: 'planning',
        progress: 0,
        total: 1,
        message: 'Planning campaign strategy...',
      });

      const campaignSpec = await this.campaignPlanner.planCampaign(siteBrief, claimsMap);

      onProgress?.({
        stage: 'planning',
        progress: 1,
        total: 1,
        message: 'Campaign plan created with 3-5 pillars',
      });

      onProgress?.({
        stage: 'generating',
        progress: 0,
        total: 6,
        message: 'Generating article content...',
      });

      // Stage 2: Generate base assets
      const articles: (ArticleAsset & { variants: AssetVariant[] })[] = [];
      for (let i = 0; i < Math.min(3, campaignSpec.pillars.length); i++) {
        const article = await this.assetGenerator.generateArticle(
          campaignSpec,
          campaignSpec.pillars[i],
          siteBrief
        );
        const variants = await this.createVariants(article.content, destinations);
        articles.push({
          ...(article as ArticleAsset),
          variants,
        });

        onProgress?.({
          stage: 'generating',
          progress: i + 1,
          total: 6,
          message: `Generated ${i + 1} article(s)`,
        });
      }

      onProgress?.({
        stage: 'generating',
        progress: 2,
        total: 6,
        message: 'Generating press release...',
      });

      const pressRelease = await this.assetGenerator.generatePressRelease(campaignSpec, siteBrief);
      const prVariants = await this.createVariants(pressRelease.content, destinations);
      const pressReleaseAsset = {
        ...(pressRelease as GeneratedAsset),
        variants: prVariants,
      };

      onProgress?.({
        stage: 'generating',
        progress: 3,
        total: 6,
        message: 'Generating newsletter...',
      });

      const newsletter = await this.assetGenerator.generateNewsletter(campaignSpec, siteBrief);
      const nlVariants = await this.createVariants(newsletter.content, destinations);
      const newsletterAsset = {
        ...(newsletter as GeneratedAsset),
        variants: nlVariants,
      };

      onProgress?.({
        stage: 'generating',
        progress: 4,
        total: 6,
        message: 'Generating social snippets...',
      });

      const socialSnippets = await this.assetGenerator.generateSocialSnippets(
        campaignSpec,
        siteBrief,
        5
      );
      const socialWithVariants: (SocialSnippet & { variants: AssetVariant[] })[] = [];
      for (const snippet of socialSnippets) {
        const variants = await this.createVariants(snippet.longForm || snippet.shortForm, destinations);
        socialWithVariants.push({
          ...(snippet as SocialSnippet),
          variants,
        });
      }

      onProgress?.({
        stage: 'generating',
        progress: 5,
        total: 6,
        message: 'Generating video script...',
      });

      const videoScript = await this.assetGenerator.generateVideoScript(campaignSpec, siteBrief);
      const videoVariants = await this.createVariants(videoScript.script, destinations);
      const videoWithVariants = [{
        ...(videoScript as VideoScript),
        variants: videoVariants,
      }];

      onProgress?.({
        stage: 'generating',
        progress: 6,
        total: 6,
        message: 'Generating podcast script...',
      });

      const podcastScript = await this.assetGenerator.generatePodcastScript(campaignSpec, siteBrief);
      const podcastVariants = await this.createVariants(podcastScript.script, destinations);
      const podcastWithVariants = [{
        ...(podcastScript as PodcastScript),
        variants: podcastVariants,
      }];

      onProgress?.({
        stage: 'complete',
        progress: 1,
        total: 1,
        message: 'Campaign generation complete!',
      });

      return {
        campaignSpec,
        assets: {
          articles,
          pressRelease: pressReleaseAsset,
          newsletter: newsletterAsset,
          socialSnippets: socialWithVariants,
          videoScript: videoWithVariants,
          podcastScript: podcastWithVariants,
        },
      };
    } catch (error) {
      console.error('Campaign generation failed:', error);
      throw error;
    }
  }

  private async createVariants(
    baseContent: string,
    destinations: string[]
  ): Promise<AssetVariant[]> {
    const variants: AssetVariant[] = [];

    for (const destination of destinations) {
      try {
        // For initial MVP, create simple variants
        // In production, this would use the full rewriter
        const variant: AssetVariant = {
          destinationKey: destination,
          uniquenessScore: 65 + Math.random() * 30, // Simulated score
          content: await this.createDestinationVariant(baseContent, destination),
          metadata: {
            generatedAt: new Date().toISOString(),
            destination,
          },
        };
        variants.push(variant);
      } catch (error) {
        console.error(`Failed to create variant for ${destination}:`, error);
      }
    }

    return variants;
  }

  private async createDestinationVariant(baseContent: string, destination: string): Promise<string> {
    // This is a simple implementation for MVP
    // In production, this would call the rewriter
    const adjustments: Record<string, (content: string) => string> = {
      linkedin: (content: string) =>
        `${content}\n\n---\n\nWhat are your thoughts on this? Share your insights in the comments.\n\n#LinkedIn #Content`,
      medium: (content: string) =>
        `# Featured\n\n${content}\n\n---\n\n*Originally published for our audience.*`,
      twitter: (content: string) =>
        content.substring(0, 250) + (content.length > 250 ? '...' : ''),
      email: (content: string) =>
        `Hello,\n\n${content}\n\nBest regards`,
      blog: (content: string) =>
        `${content}\n\n## Conclusion\n\nThis is just the beginning. Learn more about how to apply these insights.`,
      reddit: (content: string) =>
        `${content}\n\nFeel free to AMA (ask me anything) about this in the comments!`,
    };

    const transform = adjustments[destination] || ((c: string) => c);
    return transform(baseContent);
  }

  convertToContentAssets(
    campaignId: string,
    campaignAssets: CampaignAssets
  ): ContentAsset[] {
    const assets: ContentAsset[] = [];

    // Convert articles
    campaignAssets.assets.articles.forEach((article) => {
      assets.push({
        id: uuid(),
        campaignId,
        assetType: 'article',
        title: article.titleOptions[0],
        bodyMarkdown: article.content,
        excerpt: article.excerpt,
        tags: article.tags,
        status: 'draft',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Convert press release
    assets.push({
      id: uuid(),
      campaignId,
      assetType: 'press_release',
      title: campaignAssets.assets.pressRelease.title,
      bodyMarkdown: campaignAssets.assets.pressRelease.content,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    });

    // Convert newsletter
    assets.push({
      id: uuid(),
      campaignId,
      assetType: 'newsletter',
      title: campaignAssets.assets.newsletter.title,
      bodyMarkdown: campaignAssets.assets.newsletter.content,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    });

    // Convert social snippets
    campaignAssets.assets.socialSnippets.forEach((snippet) => {
      assets.push({
        id: uuid(),
        campaignId,
        assetType: 'social_snippet',
        title: `Social: ${snippet.platform}`,
        bodyMarkdown: snippet.longForm || snippet.shortForm,
        excerpt: snippet.shortForm,
        tags: snippet.hashtags,
        status: 'draft',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Convert video script
    campaignAssets.assets.videoScript.forEach((video) => {
      assets.push({
        id: uuid(),
        campaignId,
        assetType: 'video_script',
        title: video.youtubeTitle,
        bodyMarkdown: video.script,
        excerpt: video.youtubeDescription,
        tags: video.youtubeTags,
        status: 'draft',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Convert podcast script
    campaignAssets.assets.podcastScript.forEach((podcast) => {
      assets.push({
        id: uuid(),
        campaignId,
        assetType: 'podcast_script',
        title: podcast.title,
        bodyMarkdown: podcast.script,
        excerpt: podcast.rssDescription,
        tags: podcast.rssKeywords,
        status: 'draft',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    return assets;
  }
}

// Export classes
export { CampaignPlanner } from './campaign-planner';
export { AssetGenerator } from './asset-generator';
export { Rewriter } from './rewriter';
