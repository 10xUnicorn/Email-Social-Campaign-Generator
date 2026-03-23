import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  MediumPack,
} from '@/types/connector';

export class MediumPackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'medium-pack',
      name: 'Medium Assisted Pack',
      group: 'assist',
      description: 'Prepare content for manual submission to Medium',
      supportsCanonical: true,
      authType: 'none',
      contentLimits: {
        maxContentLength: 5000000,
        supportedFormats: ['markdown'],
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
      this.addError(errors, 'title', 'Article title is required');
    }

    if (!asset.bodyMarkdown || asset.bodyMarkdown.trim().length === 0) {
      this.addError(errors, 'content', 'Article content is required');
    }

    // Medium notes
    if (!asset.canonicalUrl) {
      this.addWarning(
        warnings,
        'canonicalUrl',
        'Canonical URL recommended for Medium (Medium will auto-add it)'
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
    // Build copy-ready content
    const copyReadyText = this.buildCopyReadyText(asset);
    const copyReadyMarkdown = asset.bodyMarkdown;

    // Generate Medium submission pack
    const pack: MediumPack = {
      destinationKey: 'medium-pack',
      copyReadyText,
      copyReadyMarkdown,
      importUrl: `https://medium.com/new-story?source=${encodeURIComponent(
        asset.canonicalUrl || ''
      )}`,
      fieldMappings: [
        {
          sourceField: 'title',
          targetField: 'Post Title',
          required: true,
          description: 'Article headline (optimal length: 100-120 chars)',
        },
        {
          sourceField: 'bodyMarkdown',
          targetField: 'Post Content',
          required: true,
          description: 'Article body content in markdown',
        },
        {
          sourceField: 'tags',
          targetField: 'Tags',
          required: false,
          description: 'Up to 5 tags for categorization',
        },
        {
          sourceField: 'canonicalUrl',
          targetField: 'Canonical Link (optional)',
          required: false,
          transformation: 'URL only',
          description: 'Original publication URL (Medium will auto-add credit)',
        },
      ],
      tagSuggestions: this.generateTagSuggestions(asset),
      titleOptions: this.generateTitleOptions(asset),
      canonicalNote:
        'Medium automatically detects and credits canonical URLs. No manual entry needed.',
      submissionInstructions: this.buildSubmissionInstructions(asset),
      constraintsChecklist: [
        {
          category: 'Content',
          requirement: 'Title is clear and compelling (100-120 characters ideal)',
          status: asset.title && asset.title.length <= 150 ? 'met' : 'unmet',
        },
        {
          category: 'Content',
          requirement: 'Content includes proper heading structure',
          status: asset.bodyMarkdown.includes('#') ? 'met' : 'warning',
        },
        {
          category: 'Content',
          requirement: 'First paragraph hooks reader',
          status: asset.excerpt ? 'met' : 'warning',
        },
        {
          category: 'Tagging',
          requirement: 'Maximum 5 tags used',
          status: (asset.tags?.length || 0) <= 5 ? 'met' : 'unmet',
        },
        {
          category: 'Tagging',
          requirement: 'Tags are relevant and popular',
          status: 'warning',
        },
      ],
      riskFlags: [
        {
          severity: 'low',
          category: 'Optimization',
          message: 'Medium engagement algorithms favor 5-15 minute read time',
          recommendation: 'Ensure content is ~1000-2000 words for optimal reach',
        },
        {
          severity: 'low',
          category: 'Timing',
          message: 'First 24 hours of publication affect algorithmic promotion',
          recommendation: 'Publish at optimal time for your audience (usually 9am-5pm timezone)',
        },
        {
          severity: 'medium',
          category: 'Canonical URL',
          message: 'Canonical URL affects SEO credit',
          recommendation: `${asset.canonicalUrl ? 'Your canonical URL will be detected.' : 'Provide canonical URL for proper SEO attribution'}`,
        },
      ],
    };

    return pack as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    // Assisted packs don't auto-publish
    // They return success once the pack is prepared
    const pack = payload as MediumPack;

    return this.createSuccessResult(
      `medium-pack-${Date.now()}`,
      pack.importUrl,
      {
        packType: 'assisted',
        platform: 'medium',
        submissionUrl: pack.importUrl,
        instructions: pack.submissionInstructions.substring(0, 100),
      }
    );
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const pack = (await this.mapFields(asset, campaign)) as MediumPack;

    const previewHtml = `
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px;">
  <h3 style="margin-top: 0;">Medium Submission Pack</h3>

  <div style="margin-bottom: 16px;">
    <strong>Suggested Title Options:</strong>
    <ul>
      ${pack.titleOptions.map((title) => `<li>${this.escapeHtml(title)}</li>`).join('')}
    </ul>
  </div>

  <div style="margin-bottom: 16px;">
    <strong>Suggested Tags:</strong>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      ${pack.tagSuggestions.map((tag) => `<span style="background: #e0e0e0; padding: 4px 8px; border-radius: 16px; font-size: 0.9em;">#${tag}</span>`).join('')}
    </div>
  </div>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong>Copy Ready:</strong>
    <pre style="margin: 8px 0; font-size: 0.85em; overflow-x: auto; max-height: 150px;">${this.escapeHtml(pack.copyReadyText.substring(0, 300))}...</pre>
  </div>

  <div style="background: #fff3cd; padding: 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #ffc107;">
    <strong style="color: #856404;">Note:</strong>
    <p style="margin: 8px 0 0 0; color: #856404;">${pack.canonicalNote}</p>
  </div>

  <a href="${pack.importUrl}" style="display: inline-block; background: #00ab6c; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
    Open in Medium
  </a>
</div>
    `.trim();

    return {
      destinationKey: 'medium-pack',
      mappedFields: {
        title: asset.title,
        tagsCount: String(pack.tagSuggestions.length),
        canonicalUrl: asset.canonicalUrl || 'None',
      },
      renderedPreview: previewHtml,
      warnings: [],
      suggestedEdits: pack.titleOptions.map((title, index) => ({
        field: 'title',
        currentValue: asset.title,
        suggestedValue: title,
        reason: `Alternative title option ${index + 1}`,
      })),
    };
  }

  private buildCopyReadyText(asset: ContentAsset): string {
    let text = `${asset.title}\n\n`;

    if (asset.excerpt) {
      text += `${asset.excerpt}\n\n`;
    }

    text += asset.bodyMarkdown;

    if (asset.canonicalUrl) {
      text += `\n\n---\nOriginal: ${asset.canonicalUrl}`;
    }

    return text;
  }

  private buildSubmissionInstructions(asset: ContentAsset): string {
    return `## Medium Submission Instructions

1. **Click "Open in Medium"** button above (if canonical URL is set, Medium may auto-detect it)

2. **Fill in the Title:**
   - Use one of the suggested titles above
   - Keep it under 120 characters ideally
   - Make it compelling and clear

3. **Paste the Content:**
   - Copy the content from the "Copy Ready" section
   - Paste into the Medium editor
   - Adjust formatting as needed (Medium supports markdown)

4. **Add a Subtitle (Optional):**
   - Short summary of the article (max 160 chars)
   - Helps with preview and SEO

5. **Select Tags:**
   - Use the suggested tags above
   - Maximum 5 tags allowed
   - Popular tags increase discoverability

6. **Set Featured Image (Recommended):**
   - Upload a high-quality header image
   - Recommended size: 2000x1200px minimum
   - Drives higher engagement

7. **Review & Publish:**
   - Check spelling and formatting
   - Choose "Publish immediately" or schedule for later
   - Click "Publish"

8. **Share & Promote:**
   - Share on social media after publishing
   - Medium posts typically reach peak within first 24 hours
   - Update canonical link in your original post if needed`;
  }

  private generateTagSuggestions(asset: ContentAsset): string[] {
    const tags = new Set<string>();

    // Add user-provided tags
    if (asset.tags) {
      asset.tags.slice(0, 5).forEach((tag) => tags.add(tag));
    }

    // Generate additional tag suggestions based on content
    const contentLower = asset.bodyMarkdown.toLowerCase();
    const suggestionMap: Record<string, string[]> = {
      software: ['programming', 'development', 'coding', 'tech'],
      marketing: ['growth', 'business', 'entrepreneurship', 'startup'],
      design: ['ux', 'ui', 'web-design', 'creativity'],
      data: ['analytics', 'bigdata', 'datascience', 'ai'],
      productivity: ['startup', 'business', 'productivity', 'management'],
    };

    for (const [keyword, suggestions] of Object.entries(suggestionMap)) {
      if (contentLower.includes(keyword)) {
        suggestions.forEach((tag) => {
          if (tags.size < 5) tags.add(tag);
        });
      }
    }

    // Fill with general tags if needed
    const generalTags = [
      'learning',
      'writing',
      'ideas',
      'culture',
      'technology',
    ];
    for (const tag of generalTags) {
      if (tags.size < 5) tags.add(tag);
    }

    return Array.from(tags).slice(0, 5);
  }

  private generateTitleOptions(asset: ContentAsset): string[] {
    const options: string[] = [asset.title];

    // Generate alternatives
    const wordCount = asset.bodyMarkdown.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    options.push(`${asset.title} (${readTime} min read)`);
    options.push(`${asset.title} - A Complete Guide`);
    options.push(`Everything You Need to Know About ${asset.title}`);
    options.push(`The Ultimate Guide to ${asset.title}`);

    return options.slice(0, 5);
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
