import { ContentAsset } from '@/types/index';

export interface DuplicatePair {
  assetA: ContentAsset;
  assetB: ContentAsset;
  similarityScore: number;
}

/**
 * UniquenessValidator detects duplicate and near-duplicate content
 * Uses Jaccard similarity on word n-grams
 */
export class UniquenessValidator {
  private ngramSize: number = 2; // Bigrams

  /**
   * Compute Jaccard similarity score between two texts
   * Range: 0 (completely different) to 1 (identical)
   */
  computeScore(original: string, variant: string): number {
    const originalNgrams = this.getNgrams(original);
    const variantNgrams = this.getNgrams(variant);

    if (originalNgrams.size === 0 || variantNgrams.size === 0) {
      // Handle empty texts
      return original === variant ? 1 : 0;
    }

    // Calculate intersection and union
    let intersection = 0;
    for (const ngram of originalNgrams) {
      if (variantNgrams.has(ngram)) {
        intersection++;
      }
    }

    const union = originalNgrams.size + variantNgrams.size - intersection;
    return intersection / union;
  }

  /**
   * Check if variant is unique relative to original
   */
  isUnique(original: string, variant: string, threshold: number = 0.4): boolean {
    const score = this.computeScore(original, variant);
    return score < threshold;
  }

  /**
   * Find duplicate and near-duplicate asset pairs
   */
  findDuplicates(assets: ContentAsset[], threshold: number = 0.4): DuplicatePair[] {
    const duplicates: DuplicatePair[] = [];

    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        const score = this.computeScore(assets[i].bodyMarkdown, assets[j].bodyMarkdown);

        if (score >= threshold) {
          duplicates.push({
            assetA: assets[i],
            assetB: assets[j],
            similarityScore: score,
          });
        }
      }
    }

    // Sort by similarity score (highest first)
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

    return duplicates;
  }

  /**
   * Extract n-grams from text
   */
  private getNgrams(text: string): Set<string> {
    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter((w) => w.length > 0);

    const ngrams = new Set<string>();

    for (let i = 0; i <= words.length - this.ngramSize; i++) {
      const ngram = words.slice(i, i + this.ngramSize).join(' ');
      ngrams.add(ngram);
    }

    return ngrams;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate uniqueness score for an asset relative to others
   */
  getUniquenessScore(asset: ContentAsset, otherAssets: ContentAsset[]): number {
    if (otherAssets.length === 0) {
      return 1; // Unique if no comparisons
    }

    const scores = otherAssets.map((other) =>
      this.computeScore(asset.bodyMarkdown, other.bodyMarkdown)
    );

    // Return the minimum score (closest match)
    return 1 - Math.max(...scores);
  }

  /**
   * Get detailed uniqueness analysis for an asset
   */
  analyzeUniqueness(
    asset: ContentAsset,
    otherAssets: ContentAsset[],
    threshold: number = 0.4
  ): {
    score: number;
    isDuplicate: boolean;
    similarTo: Array<{ asset: ContentAsset; similarity: number }>;
  } {
    const similarities: Array<{ asset: ContentAsset; similarity: number }> = [];

    for (const other of otherAssets) {
      const similarity = this.computeScore(asset.bodyMarkdown, other.bodyMarkdown);
      similarities.push({ asset: other, similarity });
    }

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    const score = this.getUniquenessScore(asset, otherAssets);
    const isDuplicate = similarities.length > 0 && similarities[0].similarity >= threshold;

    return {
      score,
      isDuplicate,
      similarTo: similarities.filter((s) => s.similarity >= threshold),
    };
  }

  /**
   * Batch analyze uniqueness for multiple assets
   */
  analyzeMultiple(
    assets: ContentAsset[],
    threshold: number = 0.4
  ): Array<{
    asset: ContentAsset;
    score: number;
    isDuplicate: boolean;
  }> {
    return assets.map((asset) => {
      const others = assets.filter((a) => a.id !== asset.id);
      const analysis = this.analyzeUniqueness(asset, others, threshold);

      return {
        asset,
        score: analysis.score,
        isDuplicate: analysis.isDuplicate,
      };
    });
  }

  /**
   * Set n-gram size for similarity computation
   */
  setNgramSize(size: number): void {
    if (size < 1) {
      throw new Error('N-gram size must be at least 1');
    }
    this.ngramSize = size;
  }
}

// Singleton instance
let instance: UniquenessValidator | null = null;

export function getUniquenessValidator(): UniquenessValidator {
  if (!instance) {
    instance = new UniquenessValidator();
  }
  return instance;
}
