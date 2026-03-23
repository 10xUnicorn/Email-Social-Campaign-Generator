import { ContentAsset, Campaign } from '@/types/index';
import {
  DestinationConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  MappedPayload,
  PreviewData,
  ConnectorResult,
  RateLimiterState,
} from '@/types/connector';
import { v4 as uuidv4 } from 'uuid';

/**
 * Abstract base connector class for all distribution destinations
 * Provides common functionality for validation, mapping, publishing, and previewing
 */
export abstract class BaseConnector {
  protected destinationConfig: DestinationConfig;
  protected rateLimiters: Map<string, RateLimiterState> = new Map();

  constructor(config: DestinationConfig) {
    this.destinationConfig = config;
  }

  /**
   * Get the destination configuration
   */
  getDestinationConfig(): DestinationConfig {
    return this.destinationConfig;
  }

  /**
   * Abstract method: validate asset and credentials before publishing
   */
  abstract validate(
    asset: ContentAsset,
    credentials: Record<string, any>
  ): Promise<ValidationResult>;

  /**
   * Abstract method: map ContentAsset to destination-specific payload
   */
  abstract mapFields(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<MappedPayload>;

  /**
   * Abstract method: publish mapped payload to destination
   */
  abstract publish(
    payload: MappedPayload,
    credentials: Record<string, any>
  ): Promise<ConnectorResult>;

  /**
   * Abstract method: build preview data for user review
   */
  abstract buildPreview(
    asset: ContentAsset,
    campaign: Campaign
  ): Promise<PreviewData>;

  /**
   * Enforce rate limiting based on connector configuration
   * Returns true if request should proceed, false if rate limited
   */
  protected enforceRateLimit(credentialKey?: string): boolean {
    if (!this.destinationConfig.rateLimit) {
      return true;
    }

    const key = credentialKey || 'default';
    const now = Date.now();
    const state = this.rateLimiters.get(key);

    if (!state) {
      // First request
      this.rateLimiters.set(key, {
        lastRequestTime: now,
        requestCount: 1,
        resetTime: now + this.destinationConfig.rateLimit.periodSeconds * 1000,
      });
      return true;
    }

    // Check if reset window has passed
    if (now >= state.resetTime) {
      this.rateLimiters.set(key, {
        lastRequestTime: now,
        requestCount: 1,
        resetTime: now + this.destinationConfig.rateLimit.periodSeconds * 1000,
      });
      return true;
    }

    // Check if we've exceeded rate limit
    if (state.requestCount >= this.destinationConfig.rateLimit.requests) {
      return false;
    }

    // Increment and allow
    state.requestCount++;
    state.lastRequestTime = now;
    return true;
  }

  /**
   * Generate idempotency key for request deduplication
   * Ensures same request isn't processed multiple times
   */
  protected generateIdempotencyKey(
    assetId: string,
    campaignId: string,
    destinationKey: string
  ): string {
    const key = `${assetId}-${campaignId}-${destinationKey}`;
    return Buffer.from(key).toString('hex');
  }

  /**
   * Redact sensitive information from objects for logging
   * Removes credentials, tokens, and other sensitive data
   */
  protected redactSecrets(obj: Record<string, any>): Record<string, any> {
    const sensitiveKeys = [
      'password',
      'token',
      'apikey',
      'api_key',
      'secret',
      'credentials',
      'authorization',
      'auth',
      'session',
      'accessToken',
      'refreshToken',
    ];

    const redacted = JSON.parse(JSON.stringify(obj));
    const redactRecursive = (target: any) => {
      for (const key in target) {
        if (target.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
            target[key] = '[REDACTED]';
          } else if (
            typeof target[key] === 'object' &&
            target[key] !== null
          ) {
            redactRecursive(target[key]);
          }
        }
      }
    };

    redactRecursive(redacted);
    return redacted;
  }

  /**
   * Helper: add validation error
   */
  protected addError(
    errors: ValidationError[],
    field: string,
    message: string
  ): void {
    errors.push({ field, message });
  }

  /**
   * Helper: add validation warning
   */
  protected addWarning(
    warnings: ValidationWarning[],
    field: string,
    message: string
  ): void {
    warnings.push({ field, message });
  }

  /**
   * Helper: create successful connector result
   */
  protected createSuccessResult(
    externalId?: string,
    publishedUrl?: string,
    metadata?: Record<string, any>
  ): ConnectorResult {
    return {
      success: true,
      externalId,
      publishedUrl,
      metadata,
    };
  }

  /**
   * Helper: create failed connector result
   */
  protected createErrorResult(
    code: string,
    message: string,
    retryable: boolean = true,
    details?: Record<string, any>
  ): ConnectorResult {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      retryable,
    };
  }

  /**
   * Helper: truncate text to max length with ellipsis
   */
  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Helper: convert markdown to plain text (basic)
   */
  protected markdownToPlainText(markdown: string): string {
    let text = markdown;

    // Remove markdown formatting
    text = text.replace(/#+\s?/g, ''); // Headers
    text = text.replace(/\*\*|__/g, ''); // Bold
    text = text.replace(/\*|_/g, ''); // Italic
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Links
    text = text.replace(/`([^`]+)`/g, '$1'); // Code
    text = text.replace(/^[\s]*[-*+][\s]/gm, ''); // Lists
    text = text.replace(/\n{2,}/g, '\n'); // Reduce newlines

    return text.trim();
  }

  /**
   * Helper: safe fetch with timeout and error handling
   */
  protected async safeFetch(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Helper: check if running in mock mode
   */
  protected isMockMode(): boolean {
    return process.env.MOCK_DESTINATIONS === 'true';
  }
}
