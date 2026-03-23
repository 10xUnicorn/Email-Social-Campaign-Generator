import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  CommunityPack,
  RedditPack,
  HackerNewsPack,
  ProductHuntPack,
  LaunchItem,
  Rule,
} from '@/types/connector';

export class RedditPackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'reddit-pack',
      name: 'Reddit Assisted Pack',
      group: 'assist',
      description: 'Prepare content for manual submission to Reddit subreddits',
      supportsCanonical: true,
      authType: 'none',
      contentLimits: {
        maxContentLength: 40000,
        supportedFormats: ['markdown', 'plaintext'],
      },
    };
    super(config);
  }

  async validate(
    asset: ContentAsset,
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate asset
    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Post title is required');
    } else if (asset.title.length > 300) {
      this.addWarning(
        warnings,
        'title',
        'Title exceeds 300 characters. Reddit may truncate in feeds.'
      );
    }

    if (!asset.bodyMarkdown && !asset.excerpt) {
      this.addWarning(
        warnings,
        'content',
        'No content provided. Self-post must have text or link.'
      );
    }

    // Validate subreddit if provided
    if (credentials.subreddit && !this.isValidSubreddit(credentials.subreddit)) {
      this.addWarning(
        warnings,
        'subreddit',
        'Subreddit format appears invalid (should be r/subreddit or subreddit)'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const plainBody = asset.bodyMarkdown
      ? this.markdownToPlainText(asset.bodyMarkdown)
      : '';

    const subredditOptions = this.generateSubredditOptions(asset);
    const pack: RedditPack = {
      destinationKey: 'reddit-pack',
      copyReadyText: this.truncateText(asset.title, 300),
      subredditVariants: subredditOptions.map((sub) => ({
        subreddit: sub,
        adaptedTitle: asset.title,
        adaptedContent: asset.bodyMarkdown || asset.excerpt || '',
      })),
      disclosureRequired: true,
      fieldMappings: [
        {
          sourceField: 'title',
          targetField: 'Post Title',
          required: true,
          description: 'Reddit post title (max 300 chars)',
        },
        {
          sourceField: 'bodyMarkdown',
          targetField: 'Post Content (Self-Post)',
          required: false,
          description: 'Post content in markdown (max 40,000 chars)',
        },
        {
          sourceField: 'canonicalUrl',
          targetField: 'Link (Link Post)',
          required: false,
          description: 'URL to share (for link posts)',
        },
      ],
      submissionInstructions: this.buildSubmissionInstructions(asset),
      rulesChecklist: this.buildRulesChecklist(asset),
      riskFlags: [
        {
          severity: 'high',
          category: 'Community Rules',
          message: 'Different subreddits have different posting rules',
          recommendation:
            'Read each subreddit sidebar rules before posting. Check moderation history.',
        },
        {
          severity: 'medium',
          category: 'Self-Promotion',
          message: 'Self-promotion is heavily restricted on most subreddits',
          recommendation:
            'Only post in dedicated promotion threads or niche communities. Expect removal.',
        },
        {
          severity: 'medium',
          category: 'Account Age',
          message: 'New accounts have limited posting privileges',
          recommendation:
            'If account is new, build karma with comments before posting links.',
        },
        {
          severity: 'low',
          category: 'Formatting',
          message: 'Reddit uses specific markdown syntax',
          recommendation: 'Preview your post before submitting. Test markdown formatting.',
        },
      ],
      platform: 'reddit',
    };

    return pack as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    const pack = payload as RedditPack;

    const subreddit = credentials.subreddit || pack.subredditVariants[0]?.subreddit || 'reddit';
    const redditUrl = `https://www.reddit.com/r/${subreddit.replace(/^r\//, '')}/submit`;

    return this.createSuccessResult(
      `reddit-pack-${Date.now()}`,
      redditUrl,
      {
        packType: 'assisted',
        platform: 'reddit',
        subreddit: subreddit,
        requiresManualSubmission: true,
        title: pack.copyReadyText,
      }
    );
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const pack = (await this.mapFields(asset, campaign)) as RedditPack;
    const subreddits = pack.subredditVariants.map((v) => v.subreddit);
    const content = asset.bodyMarkdown || asset.excerpt || '';

    const previewHtml = `
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #030303;">Reddit Post Preview</h3>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #818384;">
    <strong style="color: #030303;">Post Title:</strong>
    <div style="font-size: 1.1em; font-weight: 600; margin: 8px 0; color: #030303;">
      ${this.escapeHtml(asset.title)}
    </div>
    <div style="font-size: 0.85em; color: #818384;">
      Length: ${asset.title.length}/300 characters
    </div>
  </div>

  ${content ? `
  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong>Post Content Preview:</strong>
    <pre style="font-size: 0.85em; overflow-x: auto; max-height: 150px; margin: 8px 0; background: #f5f5f5; padding: 8px; border-radius: 4px;">
${this.escapeHtml(content.substring(0, 400))}${content.length > 400 ? '...' : ''}
    </pre>
    <div style="font-size: 0.85em; color: #818384;">
      Length: ${content.length}/40,000 characters
    </div>
  </div>
  ` : ''}

  <div style="background: #fff3cd; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong style="color: #856404;">Suggested Subreddits:</strong>
    <ul style="margin: 8px 0; color: #856404; padding-left: 20px;">
      ${subreddits.slice(0, 3).map((sub) => `<li>r/${sub}</li>`).join('')}
    </ul>
  </div>

  <div style="background: #f0f0f0; padding: 12px; border-radius: 4px;">
    <strong>Before Posting:</strong>
    <ul style="margin: 8px 0; padding-left: 20px; color: #555;">
      <li>Read subreddit rules in sidebar</li>
      <li>Check if self-promotion disclosure needed</li>
      <li>Verify post doesn't violate spam policy</li>
      <li>Consider best subreddit for audience</li>
    </ul>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'reddit-pack',
      mappedFields: {
        title: asset.title,
        contentLength: String(content.length),
        subredditSuggestions: subreddits.slice(0, 3).join(', '),
      },
      renderedPreview: previewHtml,
      warnings: [],
      suggestedEdits: [],
    };
  }

  private isValidSubreddit(subreddit: string): boolean {
    const cleaned = subreddit.replace(/^r\//, '').toLowerCase();
    return /^[a-z0-9_]+$/.test(cleaned) && cleaned.length >= 2 && cleaned.length <= 21;
  }

  private generateSubredditOptions(asset: ContentAsset): string[] {
    const options = new Set<string>();

    // Add general subreddits
    options.add('AdviceAnimals');
    options.add('TodayILearned');
    options.add('InterestingAsFuck');

    // Add topic-based suggestions based on content
    const contentLower = (
      asset.bodyMarkdown || asset.excerpt || ''
    ).toLowerCase();

    if (
      contentLower.includes('business') ||
      contentLower.includes('startup') ||
      contentLower.includes('entrepreneur')
    ) {
      options.add('Entrepreneur');
      options.add('startups');
      options.add('business');
    }

    if (
      contentLower.includes('technology') ||
      contentLower.includes('software') ||
      contentLower.includes('code')
    ) {
      options.add('technology');
      options.add('programming');
      options.add('learnprogramming');
    }

    if (contentLower.includes('marketing') || contentLower.includes('growth')) {
      options.add('marketing');
      options.add('GrowthHacking');
    }

    if (contentLower.includes('design') || contentLower.includes('ux')) {
      options.add('design');
      options.add('web_design');
    }

    return Array.from(options).slice(0, 5);
  }

  private buildSubmissionInstructions(asset: ContentAsset): string {
    return `## Reddit Submission Guide

1. **Choose Right Subreddit**
   - Review our suggestions above
   - Read subreddit sidebar for rules
   - Check recent posts to understand community tone

2. **Prepare Your Post**
   - Copy title from preview above
   - Use markdown for formatting: **bold**, *italic*, [links](url)
   - Break content into short paragraphs for readability
   - Add line breaks between sections

3. **Decide Post Type**
   - **Self-Post:** Use if sharing opinion, question, or your content
   - **Link Post:** Use if directing to external URL
   - Choose based on subreddit rules and content type

4. **Account Considerations**
   - Verify your account meets minimum age/karma requirements
   - If new account: comment and build karma first (safer)
   - Older accounts get better engagement and less friction

5. **Self-Promotion Disclosure**
   - If you own the content, add disclosure at top or bottom
   - Example: "Disclaimer: I wrote this article"
   - Most communities require transparency about ownership

6. **Submission Steps**
   - Visit appropriate subreddit
   - Click "Create Post"
   - Select post type (self-post or link)
   - Paste title and content from preview
   - Select flair if required
   - Review before submitting
   - Click "Post"

7. **After Submission**
   - Monitor comments and respond authentically
   - Upvotes usually peak in first 2-4 hours
   - Engagement from OP (you) increases visibility
   - Don't delete post if it underperforms - violates community guidelines

8. **Important Rules to Follow**
   - Never ask for upvotes or use vote manipulation
   - Don't cross-post same content to multiple subreddits quickly
   - Respect subreddit-specific posting hours/rules
   - No spam, alt accounts, or coordinated voting
   - Follow Reddit's Content Policy site-wide`;
  }

  private buildRulesChecklist(asset: ContentAsset): Rule[] {
    const subredditOptions = this.generateSubredditOptions(asset);
    const rules: Rule[] = [];

    // Create rules for each subreddit
    subredditOptions.forEach((subreddit) => {
      rules.push(
        {
          subreddit,
          rule: 'Clear, Descriptive Title',
          status: asset.title && asset.title.length > 10 ? 'met' : 'unmet',
        },
        {
          subreddit,
          rule: 'Appropriate Content Type',
          status: asset.bodyMarkdown || asset.excerpt ? 'met' : 'unmet',
        },
        {
          subreddit,
          rule: 'Subreddit Rules Compliance',
          status: 'warning',
        }
      );
    });

    return rules;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

export class HackerNewsPackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'hackernews-pack',
      name: 'Hacker News Assisted Pack',
      group: 'assist',
      description: 'Prepare content for Hacker News submission',
      supportsCanonical: true,
      authType: 'none',
      contentLimits: {
        maxContentLength: 5000,
        supportedFormats: ['plaintext', 'markdown'],
      },
    };
    super(config);
  }

  async validate(
    asset: ContentAsset,
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Submission title is required');
    } else if (asset.title.length > 80) {
      this.addWarning(
        warnings,
        'title',
        'Title exceeds 80 characters. Keep titles concise for HN.'
      );
    }

    // HN submissions need URL or discussion text
    if (!asset.canonicalUrl && !asset.bodyMarkdown && !asset.excerpt) {
      this.addError(
        errors,
        'content',
        'Either provide URL or discussion text for HN submission'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const plainBody = asset.bodyMarkdown
      ? this.markdownToPlainText(asset.bodyMarkdown)
      : '';

    const pack: HackerNewsPack = {
      destinationKey: 'hackernews-pack',
      copyReadyText: this.truncateText(asset.title, 80),
      titleOptions: this.generateTitleOptions(asset),
      contextSnippets: [
        asset.canonicalUrl || '',
        plainBody || asset.excerpt || '',
      ].filter((s) => s.length > 0),
      submissionTips: [
        'HN favors technical depth and original insights over promotional content',
        'Titles must be factual and not editorialized - avoid hype or clickbait',
        'If posting a link, consider adding context in comments immediately after',
        'Best times: Weekday mornings (9am-10am EST) get more visibility',
        'For discussion posts: Ask a genuine question or share a real problem',
        'Avoid duplicate submissions - search HN before posting',
        'HN community values thoughtful, substantive discussions',
        'Self-promotion is discouraged; focus on sharing interesting content first',
      ],
      fieldMappings: [
        {
          sourceField: 'title',
          targetField: 'Title',
          required: true,
          description: 'Submission title (max 80 chars, factual & specific)',
        },
        {
          sourceField: 'canonicalUrl',
          targetField: 'URL (for link submission)',
          required: false,
          description: 'External link (or leave blank for discussion)',
        },
        {
          sourceField: 'bodyMarkdown',
          targetField: 'Text (for discussion submission)',
          required: false,
          description: '2-3 sentence context or discussion starter (max 5000 chars)',
        },
      ],
      submissionInstructions: this.buildSubmissionInstructions(),
      riskFlags: [
        {
          severity: 'high',
          category: 'Moderation',
          message: 'HN heavily moderates self-promotion and ads',
          recommendation:
            'Keep promotional content to <10% of submissions. Focus on sharing interesting things.',
        },
        {
          severity: 'medium',
          category: 'Title Quality',
          message: 'Editorialized or clickbait titles get downranked/removed',
          recommendation:
            'Keep title factual. Remove hype, emojis, ALL CAPS. Let content speak for itself.',
        },
        {
          severity: 'medium',
          category: 'Community Fit',
          message: 'Not all technical content fits HN culture',
          recommendation:
            'HN values: novel insights, first-hand experience, substantive discussion. Avoid tutorials.',
        },
        {
          severity: 'low',
          category: 'Timing',
          message: 'Submission timing affects visibility',
          recommendation:
            'Weekday mornings (US timezone) get better engagement than weekends',
        },
      ],
      platform: 'hackernews',
    };

    return pack as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    const pack = payload as HackerNewsPack;

    return this.createSuccessResult(
      `hackernews-pack-${Date.now()}`,
      'https://news.ycombinator.com/submit',
      {
        packType: 'assisted',
        platform: 'hackernews',
        title: pack.copyReadyText,
        requiresManualSubmission: true,
      }
    );
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const pack = (await this.mapFields(asset, campaign)) as HackerNewsPack;
    const hasUrl = pack.contextSnippets.length > 0 && pack.contextSnippets[0].startsWith('http');
    const contextText = pack.contextSnippets.length > 1 ? pack.contextSnippets[1] : '';

    const previewHtml = `
<div style="padding: 16px; background: #f6f6ef; border-radius: 8px; font-family: Verdana, sans-serif;">
  <div style="margin-bottom: 16px;">
    <strong>Title Options:</strong>
    <div style="background: white; padding: 8px; border-radius: 4px; margin: 8px 0;">
      ${pack.titleOptions.map((t, i) => `<div style="padding: 4px; border-bottom: 1px solid #eee;">${i + 1}. ${this.escapeHtml(t)}</div>`).join('')}
    </div>
  </div>

  ${contextText ? `
  <div style="margin-bottom: 16px; background: white; padding: 12px; border-radius: 4px; border-left: 3px solid #ff6600;">
    <strong>Context to Post:</strong>
    <div style="font-size: 0.9em; margin-top: 8px; color: #333;">
      ${this.escapeHtml(contextText.substring(0, 200))}
    </div>
  </div>
  ` : ''}

  <div style="background: #fff; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong>Submission Type:</strong>
    <div style="margin-top: 8px; font-size: 0.9em;">
      ${hasUrl ? `<div>Link submission to: <code style="background: #f0f0f0; padding: 2px 4px;">${this.escapeHtml(pack.contextSnippets[0])}</code></div>` : '<div>Discussion submission (no URL)</div>'}
    </div>
  </div>

  <div style="background: #ffffcc; padding: 12px; border-radius: 4px; font-size: 0.85em;">
    <strong>Key Reminders:</strong>
    <ul style="margin: 8px 0; padding-left: 20px;">
      <li>Title must be factual, not editorialized</li>
      <li>Keep title under 80 characters</li>
      <li>For link posts, add context in first comment</li>
      <li>Focus on interesting content, not self-promotion</li>
      <li>Submit on weekday mornings for best reach</li>
    </ul>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'hackernews-pack',
      mappedFields: {
        title: pack.copyReadyText,
        url: hasUrl ? pack.contextSnippets[0] : 'None (discussion post)',
        submissionType: hasUrl ? 'Link' : 'Discussion',
      },
      renderedPreview: previewHtml,
      warnings: [],
      suggestedEdits: pack.titleOptions
        .slice(1)
        .map((title, index) => ({
          field: 'title',
          currentValue: pack.copyReadyText,
          suggestedValue: title,
          reason: `Alternative title option ${index + 2}`,
        })),
    };
  }

  private generateTitleOptions(asset: ContentAsset): string[] {
    const options: string[] = [asset.title];

    // Generate alternatives based on content
    if (asset.bodyMarkdown || asset.excerpt) {
      options.push(`${asset.title} - Discussion`);
      options.push(`Discussion: ${asset.title}`);

      // Extract potential keyword
      const content = asset.bodyMarkdown || asset.excerpt;
      if (content) {
        const contentLower = content.toLowerCase();
        if (contentLower.includes('ask hn:')) {
          options.push(`Ask HN: ${asset.title}`);
        }
      }
    }

    return options.slice(0, 5);
  }

  private buildContextStatement(asset: ContentAsset): string {
    if (asset.bodyMarkdown) {
      const plainText = this.markdownToPlainText(asset.bodyMarkdown);
      return plainText.substring(0, 300);
    }
    if (asset.excerpt) {
      return asset.excerpt.substring(0, 300);
    }
    return '';
  }

  private buildSubmissionInstructions(): string {
    return `## How to Submit to Hacker News

1. **Go to Hacker News**
   - Visit https://news.ycombinator.com/submit

2. **Enter Title**
   - Use one of the suggested title options above
   - Must be factual and specific (no clickbait)
   - Keep under 80 characters
   - Avoid ALL CAPS, emojis, or editorializing

3. **Choose Submission Type**
   - **Link submission:** Paste URL in "URL" field
   - **Discussion:** Leave URL blank, add context in "text" field

4. **Add Context (important)**
   - If posting a link: Comment immediately with context or discussion starter
   - If discussion post: Provide 2-3 sentences of context or the question
   - This helps explain why this is interesting to the HN community

5. **Submit**
   - Review title and content one more time
   - Click "submit"
   - You'll be taken to the discussion page

6. **Engage After Posting**
   - Respond to comments authentically
   - Answer questions about your submission
   - Acknowledge corrections or improvements
   - First 30 minutes are critical for ranking

7. **Community Guidelines**
   - Don't ask for upvotes (strongly discouraged)
   - Don't cross-post the same link/content repeatedly
   - Avoid self-promotion if account is new
   - Be honest about affiliation in comments
   - Focus on interesting technical content, not marketing`;
  }

  private isTitleFactual(title: string): boolean {
    const hyperbolicWords = [
      'amazing',
      'incredible',
      'revolutionary',
      'shocking',
      'must-see',
      'you-wont-believe',
    ];
    const lowerTitle = title.toLowerCase();
    return !hyperbolicWords.some((word) => lowerTitle.includes(word));
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

export class ProductHuntPackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'producthunt-pack',
      name: 'Product Hunt Assisted Pack',
      group: 'assist',
      description: 'Prepare launch checklist and assets for Product Hunt',
      supportsCanonical: true,
      authType: 'none',
      contentLimits: {
        maxContentLength: 10000,
        supportedFormats: ['plaintext', 'markdown'],
      },
    };
    super(config);
  }

  async validate(
    asset: ContentAsset,
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Product/launch title is required');
    }

    if (!asset.excerpt && !asset.bodyMarkdown) {
      this.addWarning(
        warnings,
        'content',
        'Product description/tagline recommended for PH launch'
      );
    }

    if (!asset.canonicalUrl) {
      this.addWarning(
        warnings,
        'canonicalUrl',
        'Product website URL is important for PH links'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload> {
    const plainBody = asset.bodyMarkdown
      ? this.markdownToPlainText(asset.bodyMarkdown)
      : '';

    const pack: ProductHuntPack = {
      destinationKey: 'producthunt-pack',
      copyReadyText: this.truncateText(asset.title, 60),
      launchChecklist: this.buildLaunchChecklist(asset),
      assetsNeeded: [
        'Product Icon/Logo (512x512px)',
        'Thumbnail for list view (200x150px)',
        'Gallery images - up to 5 (1200x675px)',
        'Video demo - optional (MP4, <30s)',
        'Clear product description',
        'Pricing information',
        'Support documentation',
        'Professional hunter profile',
      ],
      copyVariations: [
        {
          type: 'headline',
          variant: `${asset.title} is a [type of solution] that [solves specific problem].`,
        },
        {
          type: 'tagline',
          variant: this.truncateText(asset.excerpt || asset.title, 60),
        },
        {
          type: 'description',
          variant: plainBody || 'Describe your product\'s key features and benefits.',
        },
      ],
      fieldMappings: [
        {
          sourceField: 'title',
          targetField: 'Product Name',
          required: true,
          description: 'Name of your product (max 60 chars)',
        },
        {
          sourceField: 'excerpt',
          targetField: 'Tagline',
          required: true,
          description: 'One-line tagline (max 60 chars)',
        },
        {
          sourceField: 'bodyMarkdown',
          targetField: 'Product Description',
          required: true,
          description: 'Detailed description of your product (2-3 paragraphs)',
        },
        {
          sourceField: 'canonicalUrl',
          targetField: 'Product Website',
          required: true,
          description: 'URL to your product',
        },
      ],
      submissionInstructions: this.buildSubmissionInstructions(asset),
      riskFlags: [
        {
          severity: 'high',
          category: 'Product Readiness',
          message: 'Product Hunt launch day is critical - have everything ready',
          recommendation:
            'Complete product, pricing clear, support team ready, no major bugs. Test thoroughly.',
        },
        {
          severity: 'high',
          category: 'Community Preparation',
          message: 'PH success depends on community engagement',
          recommendation:
            'Build audience before launch. Engage with PH community first. Plan launch promotion.',
        },
        {
          severity: 'medium',
          category: 'Copy Quality',
          message: 'Poor product description hurts ranking',
          recommendation:
            'Keep description concise, benefit-focused, jargon-free. Edit ruthlessly.',
        },
        {
          severity: 'medium',
          category: 'Visual Assets',
          message: 'Low-quality images reduce clicks and credibility',
          recommendation:
            'Use professional visuals. Invest in good product photos/screenshots. Test appearance.',
        },
        {
          severity: 'low',
          category: 'Timing',
          message: 'Launch timing affects visibility and momentum',
          recommendation:
            'Tuesday-Thursday mornings (PST) typically see higher engagement. Avoid Fridays.',
        },
      ],
      platform: 'producthunt',
    };

    return pack as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    const pack = payload as ProductHuntPack;

    return this.createSuccessResult(
      `producthunt-pack-${Date.now()}`,
      'https://www.producthunt.com/launch',
      {
        packType: 'assisted',
        platform: 'producthunt',
        productName: pack.copyReadyText,
        requiresManualSubmission: true,
      }
    );
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const pack = (await this.mapFields(asset, campaign)) as ProductHuntPack;
    const tagline = pack.copyVariations.find((c) => c.type === 'tagline')?.variant || asset.excerpt || '';
    const description = pack.copyVariations.find((c) => c.type === 'description')?.variant || '';

    const previewHtml = `
<div style="padding: 16px; background: #f8f8f8; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #ff6154;">Product Hunt Launch Prep</h3>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #ff6154;">
    <strong>Product Name:</strong>
    <div style="font-size: 1.1em; font-weight: 600; margin: 8px 0;">
      ${this.escapeHtml(pack.copyReadyText)}
    </div>
  </div>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong>Tagline:</strong>
    <div style="margin: 8px 0; color: #666;">
      ${this.escapeHtml(tagline || '(No tagline provided)')}
    </div>
  </div>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong>Website:</strong>
    <div style="margin: 8px 0; font-family: monospace; font-size: 0.9em; color: #0066cc;">
      ${this.escapeHtml(asset.canonicalUrl || '(No URL provided)')}
    </div>
  </div>

  <div style="background: #fff3cd; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong style="color: #856404;">Assets Checklist:</strong>
    <ul style="margin: 8px 0; color: #856404; padding-left: 20px;">
      ${pack.assetsNeeded.map((asset) => `<li>${this.escapeHtml(asset)}</li>`).join('')}
    </ul>
  </div>

  <div style="background: #e8f4f8; padding: 12px; border-radius: 4px;">
    <strong style="color: #0c5460;">Launch Checklist (${pack.launchChecklist.length} items):</strong>
    <ul style="margin: 8px 0; color: #0c5460; padding-left: 20px;">
      ${pack.launchChecklist
        .slice(0, 5)
        .map((item) => `<li>${this.escapeHtml(item.item)}</li>`)
        .join('')}
    </ul>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'producthunt-pack',
      mappedFields: {
        productName: pack.copyReadyText,
        tagline: tagline,
        url: asset.canonicalUrl || 'N/A',
      },
      renderedPreview: previewHtml,
      warnings: [],
      suggestedEdits: [],
    };
  }

  private buildLaunchChecklist(asset: ContentAsset): LaunchItem[] {
    return [
      {
        item: 'Product is fully functional and stable',
        status: 'pending',
        notes: 'No major bugs, critical features working',
      },
      {
        item: 'Pricing is clear and published',
        status: 'pending',
        notes: 'Free tier details, paid tiers, or one-time pricing',
      },
      {
        item: 'Support/help documentation available',
        status: 'pending',
        notes: 'FAQ, docs, help center, or support email',
      },
      {
        item: 'Security and privacy policies posted',
        status: 'pending',
        notes: 'Shows professionalism and user trust',
      },
      {
        item: 'Product icon uploaded (512x512px+)',
        status: 'pending',
        notes: 'Square image, transparent background ideal',
      },
      {
        item: 'Thumbnail created for list view',
        status: 'pending',
        notes: '200x150px representative image',
      },
      {
        item: 'Gallery images prepared (1-5 images)',
        status: 'pending',
        notes: 'Feature screenshots, product in action, use cases',
      },
      {
        item: 'Video demo created (optional, <30s)',
        status: 'pending',
        notes: 'Shows product features and benefits clearly',
      },
      {
        item: 'Description written and proofread',
        status: 'pending',
        notes: 'Clear, benefit-focused, no jargon',
      },
      {
        item: 'Hunter bio and profile polished',
        status: 'pending',
        notes: 'PH profile photo, engaging bio, active history',
      },
      {
        item: 'Launch plan communicated to team',
        status: 'pending',
        notes: 'Who handles comments, how to respond, escalations',
      },
      {
        item: 'Promotion plan ready (email, social)',
        status: 'pending',
        notes: 'Send to audience, mention in communities (tastefully)',
      },
      {
        item: 'First comment/discussion starter planned',
        status: 'pending',
        notes: 'Post immediately to show engagement',
      },
    ];
  }

  private buildSubmissionInstructions(asset: ContentAsset): string {
    return `## Product Hunt Launch Guide

1. **Set Up Your Hunter Account**
   - Create Product Hunt account (if new)
   - Complete profile with photo and bio
   - Build credibility: engage with other launches first
   - Follow at least 10-20 products in your category

2. **Prepare Your Product Page**
   - Upload product icon/logo (512x512px minimum)
   - Write clear, benefit-focused description (2-3 paragraphs)
   - Paste product website URL
   - Add gallery images (1-5 high-quality screenshots)
   - Optional: Upload video demo (max 30 seconds)
   - Set pricing (free, freemium, or paid)
   - Add 5-10 relevant tags/categories

3. **Write Compelling Copy**
   - Tagline: One sentence that captures the value (60 chars max)
   - Description: Hook, problem, solution, benefits (use our templates)
   - Keep jargon minimal; focus on user benefits
   - Use short paragraphs for readability
   - Include social proof if available (beta users, companies using it)

4. **Choose Launch Timing**
   - Tuesday-Thursday mornings (Pacific time) see highest engagement
   - Avoid Mondays (competition), Fridays (attention drops)
   - Set specific launch time (12:01am PST is typical)

5. **Prepare Launch Day Team**
   - Assign comment responder(s)
   - Train on company voice and values
   - Prepare common answer templates
   - Set up notifications for comments
   - Have CEO/founder ready to engage authentically

6. **Day-Before Final Check**
   - Proofread everything multiple times
   - Test product links work correctly
   - Ensure website loads fast
   - Check gallery images display properly
   - Verify support email is monitored

7. **Launch Day Timeline**
   - **12:01am (Launch):** Post goes live
   - **Within 5 min:** Post first comment (introduce yourself, share story)
   - **First 2 hours:** Be extremely responsive, reply to every comment
   - **Mid-day:** Update "Ship" section with milestones/gratitude
   - **Throughout day:** Share genuine responses, answer questions
   - **Evening:** Thank supporters, acknowledge feedback

8. **Engagement Best Practices**
   - Respond authentically (no corporate-speak)
   - Ask follow-up questions to commenters
   - Be gracious about criticism and suggestions
   - Don't argue or be defensive
   - Share your maker story naturally in conversations
   - Thank genuine supporters by name
   - Use "Made by humans" energy

9. **After Launch**
   - Keep responding to comments for 3-5 days
   - Collect feedback for roadmap
   - Follow up with interested users
   - Consider launching on ProductLaunch.me and other platforms
   - Analyze comments for product improvements`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}
