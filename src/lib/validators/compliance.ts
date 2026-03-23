import { ContentAsset, ComplianceSettings, ValidationReport } from '@/types/index';
import { DestinationConfig } from '@/types/connector';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * ComplianceValidator checks assets against platform policies
 * and destination-specific constraints
 */
export class ComplianceValidator {
  /**
   * Validate an asset for compliance and destination requirements
   */
  validateAsset(
    asset: ContentAsset,
    destination: DestinationConfig,
    settings: ComplianceSettings
  ): ValidationReport {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Content length validation
    if (destination.contentLimits?.maxContentLength) {
      if (asset.bodyMarkdown.length > destination.contentLimits.maxContentLength) {
        errors.push({
          field: 'bodyMarkdown',
          message: `Content exceeds ${destination.contentLimits.maxContentLength} character limit`,
          severity: 'error',
        });
      }
    }

    // Title length validation
    if (destination.contentLimits?.maxTitleLength) {
      if (asset.title.length > destination.contentLimits.maxTitleLength) {
        errors.push({
          field: 'title',
          message: `Title exceeds ${destination.contentLimits.maxTitleLength} character limit`,
          severity: 'error',
        });
      }
    }

    // Link count validation
    const linkCount = this.countLinks(asset.bodyMarkdown);
    const maxLinks = this.getMaxLinksPolicy(destination.key);
    if (linkCount > maxLinks) {
      errors.push({
        field: 'bodyMarkdown',
        message: `Content contains ${linkCount} links, maximum is ${maxLinks}`,
        severity: 'error',
      });
    }

    // Anchor text normalization check
    if (!this.validateAnchorText(asset.bodyMarkdown)) {
      warnings.push({
        field: 'bodyMarkdown',
        message: 'Some links may have poor anchor text (too generic or keyword-stuffed)',
        severity: 'warning',
      });
    }

    // Canonical URL requirement
    if (settings.canonicalStrategy === 'enforce' && !asset.canonicalUrl) {
      if (destination.supportsCanonical) {
        errors.push({
          field: 'canonicalUrl',
          message: 'Canonical URL is required but not provided',
          severity: 'error',
        });
      }
    }

    // Claims verification
    const unverifiedClaims = asset.claims?.filter((c) => !c.verified) || [];
    if (
      settings.claimsPolicy.requireVerification &&
      unverifiedClaims.length > settings.claimsPolicy.maxUnverifiedClaims
    ) {
      errors.push({
        field: 'claims',
        message: `Too many unverified claims (${unverifiedClaims.length}), max ${settings.claimsPolicy.maxUnverifiedClaims}`,
        severity: 'error',
      });
    }

    // Disclosure requirements
    if (this.requiresDisclosure(asset)) {
      if (!asset.disclosures || asset.disclosures.length === 0) {
        warnings.push({
          field: 'disclosures',
          message: 'Asset contains affiliate links - disclosure may be required',
          severity: 'warning',
        });
      }
    }

    // Tags validation
    if (destination.contentLimits?.maxTagsCount) {
      if (asset.tags.length > destination.contentLimits.maxTagsCount) {
        warnings.push({
          field: 'tags',
          message: `Asset has ${asset.tags.length} tags, destination limit is ${destination.contentLimits.maxTagsCount}`,
          severity: 'warning',
        });
      }
    }

    // Check for blocked claims
    const blockedClaims = this.findBlockedClaims(asset);
    for (const claim of blockedClaims) {
      errors.push({
        field: 'claims',
        message: `Claim "${claim}" may be considered medical/financial without proper citations`,
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Count markdown links in content
   */
  private countLinks(content: string): number {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const matches = content.match(linkRegex);
    return matches ? matches.length : 0;
  }

  /**
   * Get max links policy for destination
   */
  private getMaxLinksPolicy(destinationKey: string): number {
    const policies: Record<string, number> = {
      'prlog-pack': 2,
      'medium-pack': 5,
      mastodon: 3,
      bluesky: 10,
      wordpress: 20,
      'forem-dev': 10,
    };
    return policies[destinationKey] || 10;
  }

  /**
   * Validate anchor text quality
   */
  private validateAnchorText(content: string): boolean {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    const badPatterns = [
      /click here/i,
      /read more/i,
      /link/i,
      /here/i,
      /^http/i,
      /^www\./i,
      /^$/,
    ];

    while ((match = linkRegex.exec(content)) !== null) {
      const anchorText = match[1].trim();
      if (badPatterns.some((pattern) => pattern.test(anchorText))) {
        return false;
      }

      // Check for excessive keyword stuffing (same word repeated)
      const words = anchorText.toLowerCase().split(/\s+/);
      if (words.length > 1) {
        const wordCounts = new Map<string, number>();
        for (const word of words) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
        for (const count of wordCounts.values()) {
          if (count > words.length / 2) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if content requires disclosure (affiliate links, sponsorship, etc)
   */
  private requiresDisclosure(asset: ContentAsset): boolean {
    const content = asset.bodyMarkdown.toLowerCase();

    // Check for common affiliate indicators
    const affiliatePatterns = [
      /affiliate/i,
      /sponsored/i,
      /ad:/i,
      /aff/i,
      /partner/i,
      /commission/i,
    ];

    return affiliatePatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Find potentially blocked claims (medical/financial)
   */
  private findBlockedClaims(asset: ContentAsset): string[] {
    const content = asset.bodyMarkdown.toLowerCase();

    // Medical keywords requiring verification
    const medicalKeywords = [
      'cure',
      'treat',
      'heal',
      'prevent disease',
      'diagnosed',
      'miracle',
      'FDA approved',
    ];

    // Financial keywords requiring verification
    const financialKeywords = [
      'guaranteed return',
      'risk-free',
      'get rich',
      'make money fast',
      'investment returns',
      'stock pick',
    ];

    const blocked: string[] = [];

    for (const keyword of medicalKeywords) {
      if (content.includes(keyword)) {
        // Check if claim is verified
        const isVerified = asset.claims?.some(
          (c) => c.verified && c.text.toLowerCase().includes(keyword)
        );
        if (!isVerified) {
          blocked.push(keyword);
        }
      }
    }

    for (const keyword of financialKeywords) {
      if (content.includes(keyword)) {
        const isVerified = asset.claims?.some(
          (c) => c.verified && c.text.toLowerCase().includes(keyword)
        );
        if (!isVerified) {
          blocked.push(keyword);
        }
      }
    }

    return blocked;
  }

  /**
   * Validate multiple assets and return summary
   */
  validateAssets(
    assets: ContentAsset[],
    destination: DestinationConfig,
    settings: ComplianceSettings
  ): {
    valid: ContentAsset[];
    invalid: Array<{ asset: ContentAsset; report: ValidationReport }>;
  } {
    const valid: ContentAsset[] = [];
    const invalid: Array<{ asset: ContentAsset; report: ValidationReport }> = [];

    for (const asset of assets) {
      const report = this.validateAsset(asset, destination, settings);
      if (report.isValid) {
        valid.push(asset);
      } else {
        invalid.push({ asset, report });
      }
    }

    return { valid, invalid };
  }
}

// Singleton instance
let instance: ComplianceValidator | null = null;

export function getComplianceValidator(): ComplianceValidator {
  if (!instance) {
    instance = new ComplianceValidator();
  }
  return instance;
}
