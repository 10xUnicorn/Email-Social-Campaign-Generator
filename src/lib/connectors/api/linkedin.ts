import { BaseConnector } from '../base';
import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  MappedPayload,
  PreviewData,
  ConnectorResult,
} from '@/types/connector';

interface LinkedInCredentials {
  accessToken: string;
  authorUrn?: string; // e.g., "urn:li:person:XXXXX"
}

interface LinkedInUGCPost {
  author: string;
  lifecycleState: 'PUBLISHED' | 'DRAFT';
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: 'ARTICLE' | 'IMAGE' | 'VIDEO' | 'NONE';
      media?: Array<{
        status: 'READY';
        media: string;
      }>;
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN' | 'PRIVATE';
  };
}

export class LinkedInConnector extends BaseConnector {
  constructor() {
    const config: DestinationConfig = {
      key: 'linkedin',
      name: 'LinkedIn',
      group: 'api',
      description: 'Share User-Generated Content on LinkedIn',
      supportsCanonical: false,
      authType: 'oauth',
      rateLimit: {
        requests: 10,
        periodSeconds: 3600,
      },
      contentLimits: {
        maxTitleLength: 300,
        maxContentLength: 3000,
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

    if (!credentials.accessToken) {
      this.addError(errors, 'credentials', 'Access Token is required');
    }

    if (!credentials.authorUrn) {
      this.addError(errors, 'credentials', 'Author URN is required (e.g., urn:li:person:XXXXX)');
    }

    if (credentials.authorUrn && !credentials.authorUrn.startsWith('urn:li:')) {
      this.addError(errors, 'authorUrn', 'Author URN must start with urn:li:');
    }

    if (!asset.title && !asset.excerpt) {
      this.addError(errors, 'content', 'Title or content is required');
    }

    if (asset.title && asset.title.length > 300) {
      this.addWarning(warnings, 'title', 'Title should not exceed 300 characters');
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
    const text = (asset.title || '') + '\n\n' + (asset.bodyMarkdown || asset.excerpt || '');

    const post: LinkedInUGCPost = {
      author: '',
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: this.truncateText(text, 3000),
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    return post as unknown as MappedPayload;
  }

  async publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult> {
    if (this.isMockMode()) {
      return this.createSuccessResult(
        `linkedin-${Date.now()}`,
        `https://www.linkedin.com/feed/update/${Date.now()}`
      );
    }

    try {
      const post = payload as LinkedInUGCPost;
      post.author = credentials.authorUrn;

      const response = await this.safeFetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `LINKEDIN_${response.status}`,
          `LinkedIn API error: ${response.status}`,
          response.status >= 500
        );
      }

      const result = await response.json();
      const postId = result.id || result.entityUrn;

      return this.createSuccessResult(
        postId,
        `https://www.linkedin.com/feed/update/${postId}`,
        { linkedinPostId: postId }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to LinkedIn';
      return this.createErrorResult('LINKEDIN_ERROR', message, true);
    }
  }

  async buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData> {
    const mapped = await this.mapFields(asset, campaign);
    const post = mapped as LinkedInUGCPost;

    const previewHtml = `
<div style="padding: 16px; background: #f3f3f3; border-radius: 8px; font-family: system-ui;">
  <h3 style="margin-top: 0; color: #0a66c2;">LinkedIn Post Preview</h3>
  <div style="background: white; padding: 12px; border-radius: 4px;">
    <div style="white-space: pre-wrap; word-wrap: break-word; color: #333;">
      ${this.escapeHtml(post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text)}
    </div>
  </div>
</div>
    `.trim();

    return {
      destinationKey: 'linkedin',
      mappedFields: {
        content: post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text.substring(0, 100),
      },
      renderedPreview: previewHtml,
      warnings: [],
      suggestedEdits: [],
    };
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }
}

export default LinkedInConnector;
