import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  PRLogPack,
} from '@/types/connector';

export class PRLogPackConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'prlog-pack',
      name: 'PRLog Assisted Pack',
      group: 'assist',
      description: 'Prepare press releases for PRLog distribution',
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

    // Validate asset
    if (!asset.title || asset.title.trim().length === 0) {
      this.addError(errors, 'title', 'Press release headline is required');
    } else if (asset.title.length > 200) {
      this.addWarning(
        warnings,
        'title',
        'Headline exceeds 200 characters. PRLog may truncate.'
      );
    }

    if (!asset.excerpt || asset.excerpt.trim().length === 0) {
      this.addError(
        errors,
        'excerpt',
        'Summary/lead paragraph is required for PRLog'
      );
    } else if (asset.excerpt.length > 300) {
      this.addWarning(
        warnings,
        'excerpt',
        'Summary exceeds 300 characters. Consider shortening for impact.'
      );
    }

    if (!asset.bodyMarkdown || asset.bodyMarkdown.trim().length === 0) {
      this.addError(errors, 'body', 'Press release body is required');
    }

    // Count links
    const linkRegex = /https?:\/\/[^\s)]+/g;
    const linkCount = (asset.bodyMarkdown.match(linkRegex) || []).length;
    if (linkCount > 3) {
      this.addWarning(
        warnings,
        'links',
        `Found ${linkCount} links. PRLog limits functional links in body. Use only 1-3.`
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
    // Convert to PR format
    const plainTextBody = this.markdownToPlainText(asset.bodyMarkdown);

    const pack: PRLogPack = {
      destinationKey: 'prlog-pack',
      headline: this.truncateText(asset.title, 200),
      summary: asset.excerpt || plainTextBody.substring(0, 300),
      body: plainTextBody,
      copyReadyText: this.buildCopyReadyText(asset),
      fieldMappings: [
        {
          sourceField: 'title',
          targetField: 'Headline',
          required: true,
          description: 'Press release headline (max 200 chars)',
        },
        {
          sourceField: 'excerpt',
          targetField: 'Summary',
          required: true,
          description: 'Lead paragraph / press summary (max 300 chars)',
        },
        {
          sourceField: 'bodyMarkdown',
          targetField: 'Press Release Body',
          required: true,
          description: 'Full press release text (plain text, max 5000 chars)',
        },
        {
          sourceField: 'canonicalUrl',
          targetField: 'Press Release Link',
          required: false,
          description: 'Link to full announcement or source material',
        },
      ],
      submissionInstructions: this.buildSubmissionInstructions(),
      constraintsChecklist: [
        {
          category: 'Format',
          requirement: 'Uses professional press release structure',
          status: asset.excerpt && asset.title ? 'met' : 'unmet',
          details: 'Should have headline, summary, and body',
        },
        {
          category: 'Length',
          requirement: 'Headline under 200 characters',
          status: asset.title.length <= 200 ? 'met' : 'unmet',
          details: `Current: ${asset.title.length} chars`,
        },
        {
          category: 'Length',
          requirement: 'Summary under 300 characters',
          status:
            (asset.excerpt?.length || 0) <= 300 ? 'met' : 'warning',
          details: `Current: ${asset.excerpt?.length || 0} chars`,
        },
        {
          category: 'Length',
          requirement: 'Body under 5000 characters',
          status: plainTextBody.length <= 5000 ? 'met' : 'unmet',
          details: `Current: ${plainTextBody.length} chars`,
        },
        {
          category: 'Content',
          requirement: 'Contains contact information',
          status: this.hasContactInfo(plainTextBody)
            ? 'met'
            : 'warning',
          details: 'Add email or phone for media inquiries',
        },
        {
          category: 'Links',
          requirement: 'Limited to 1-3 functional links',
          status: this.countLinks(plainTextBody) <= 3 ? 'met' : 'unmet',
          details: `Current: ${this.countLinks(plainTextBody)} links`,
        },
      ],
      riskFlags: [
        {
          severity: 'medium',
          category: 'Distribution',
          message: 'PRLog has free and premium tiers',
          recommendation:
            'Free tier reaches fewer outlets. Consider premium for wider distribution.',
        },
        {
          severity: 'low',
          category: 'Formatting',
          message: 'Plain text formatting works best on PRLog',
          recommendation:
            'Avoid markdown special chars. Use line breaks for formatting.',
        },
        {
          severity: 'medium',
          category: 'Approval',
          message: 'Press releases are manually reviewed',
          recommendation:
            'Submissions typically approved within 2-4 hours. Follow PRLog guidelines.',
        },
        {
          severity: 'low',
          category: 'SEO',
          message: 'Include relevant keywords naturally',
          recommendation:
            'Use industry terms and company name for better search visibility.',
        },
      ],
      constraintDetails: {
        summaryLimitChars: 300,
        maxLinksCount: 3,
        supportedCategories: [
          'Business',
          'Press Releases',
          'Corporate News',
          'Product Launch',
          'Technology',
          'Marketing',
          'Finance',
          'Non-Profit',
        ],
      },
    };

    return pack as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    // Assisted packs don't auto-publish
    const pack = payload as PRLogPack;

    return this.createSuccessResult(
      `prlog-pack-${Date.now()}`,
      'https://www.prlog.org/submit-press-release/',
      {
        packType: 'assisted',
        platform: 'prlog',
        headline: pack.headline,
        requiresManualSubmission: true,
      }
    );
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const pack = (await this.mapFields(asset, campaign)) as PRLogPack;
    const plainBody = this.markdownToPlainText(asset.bodyMarkdown);

    const previewHtml = `
<div style="padding: 16px; background: #f5f5f5; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0;">PRLog Press Release Pack</h3>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #d32f2f;">
    <strong>Headline:</strong>
    <div style="font-size: 1.1em; font-weight: bold; margin: 8px 0;">
      ${this.escapeHtml(pack.headline)}
    </div>
    <div style="font-size: 0.85em; color: #666;">
      Length: ${pack.headline.length}/200 characters
    </div>
  </div>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px; border-left: 4px solid #1976d2;">
    <strong>Summary:</strong>
    <div style="margin: 8px 0; color: #333;">
      ${this.escapeHtml(pack.summary.substring(0, 200))}...
    </div>
    <div style="font-size: 0.85em; color: #666;">
      Length: ${pack.summary.length}/300 characters
    </div>
  </div>

  <div style="background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
    <strong>Body Preview:</strong>
    <pre style="font-size: 0.85em; overflow-x: auto; max-height: 150px; margin: 8px 0;">
${this.escapeHtml(plainBody.substring(0, 400))}...
    </pre>
    <div style="font-size: 0.85em; color: #666;">
      Length: ${plainBody.length}/5000 characters
    </div>
  </div>

  <div style="background: #fff3cd; padding: 12px; border-radius: 4px;">
    <strong style="color: #856404;">Constraints:</strong>
    <ul style="margin: 8px 0; color: #856404; padding-left: 20px;">
      <li>Summary: ${pack.summary.length <= 300 ? '✓ OK' : '✗ Too long'}</li>
      <li>Body: ${plainBody.length <= 5000 ? '✓ OK' : '✗ Too long'}</li>
      <li>Links: ${this.countLinks(plainBody)} / ${pack.constraintDetails.maxLinksCount} allowed</li>
    </ul>
  </div>
</div>
    `.trim();

    const warnings = [];
    if (pack.headline.length > 200) {
      warnings.push({
        type: 'compliance' as const,
        message: 'Headline exceeds 200 characters',
        affectedField: 'headline',
      });
    }

    if (this.countLinks(plainBody) > 3) {
      warnings.push({
        type: 'compliance' as const,
        message: `Too many links (${this.countLinks(plainBody)}). PRLog allows max 3.`,
        affectedField: 'body',
      });
    }

    return {
      destinationKey: 'prlog-pack',
      mappedFields: {
        headline: pack.headline,
        summary: pack.summary.substring(0, 100) + '...',
        bodyLength: String(plainBody.length),
        links: String(this.countLinks(plainBody)),
      },
      renderedPreview: previewHtml,
      warnings,
      suggestedEdits: [],
    };
  }

  private buildCopyReadyText(asset: ContentAsset): string {
    const plainBody = this.markdownToPlainText(asset.bodyMarkdown);

    return `${asset.title}\n\n${asset.excerpt || ''}\n\n${plainBody}\n\n${asset.canonicalUrl ? `For more information: ${asset.canonicalUrl}` : ''}`;
  }

  private buildSubmissionInstructions(): string {
    return `## PRLog Press Release Submission

1. **Go to PRLog.org**
   - Visit https://www.prlog.org/submit-press-release/

2. **Create or Sign Into Account**
   - Create free account or sign in
   - Note: Free tier reaches fewer outlets

3. **Fill in the Form:**
   - **Headline:** Copy from "Headline" above (max 200 chars)
   - **Summary:** Copy from "Summary" above (max 300 chars)
   - **Press Release:** Copy from "Body" section
   - **Link:** Paste your canonical URL if available

4. **Select Category**
   - Choose most relevant category from list
   - Examples: Business, Press Releases, Corporate News, Product Launch

5. **Add Contact Information**
   - Include your email for media inquiries
   - PRLog requires contact details

6. **Set Distribution**
   - Free tier: Limited distribution
   - Premium: Wider reach to media outlets

7. **Review & Submit**
   - Check spelling and formatting
   - Ensure all required fields filled
   - Click Submit

8. **Approval Process**
   - Press releases typically reviewed within 2-4 hours
   - PRLog staff may edit for clarity/compliance
   - Approved releases distributed to news outlets

9. **Promote Your Release**
   - Share link on social media
   - Include in marketing communications
   - Monitor traffic and media pickups`;
  }

  private countLinks(text: string): number {
    const linkRegex = /https?:\/\/[^\s)]+/g;
    return (text.match(linkRegex) || []).length;
  }

  private hasContactInfo(text: string): boolean {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /\(?[\d\s\-\+\.]{10,}\)?/;
    return emailRegex.test(text) || phoneRegex.test(text);
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
