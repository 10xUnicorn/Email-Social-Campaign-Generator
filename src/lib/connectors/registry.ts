import { BaseConnector } from './base';
import { DestinationConfig } from '@/types/connector';

// API Connectors
import { WordPressConnector } from './api/wordpress';
import { ForemDevConnector } from './api/forem-dev';
import { MastodonConnector } from './api/mastodon';
import { BlueskyConnector } from './api/bluesky';

// Feed Connectors
import { IndexNowConnector } from './feed/indexnow';
import { RSSGeneratorConnector } from './feed/rss-generator';

// Assisted Pack Connectors
import { MediumPackConnector } from './assisted/medium-pack';
import { PRLogPackConnector } from './assisted/prlog-pack';
import {
  RedditPackConnector,
  HackerNewsPackConnector,
  ProductHuntPackConnector,
} from './assisted/community-packs';

/**
 * ConnectorRegistry
 *
 * Central registry for all available connectors (API, Feed, and Assisted Pack).
 * Manages connector instantiation, lookup, validation, and discovery.
 *
 * Supports:
 * - API connectors: WordPress, DEV/Forem, Mastodon, Bluesky
 * - Feed connectors: IndexNow, RSS Generator
 * - Assisted packs: Medium, PRLog, Reddit, Hacker News, Product Hunt
 */
export class ConnectorRegistry {
  private connectors: Map<string, BaseConnector> = new Map();
  private connectorConfigs: Map<string, DestinationConfig> = new Map();

  constructor() {
    this.registerConnectors();
  }

  /**
   * Register all available connectors
   */
  private registerConnectors(): void {
    // API Connectors
    this.register(new WordPressConnector());
    this.register(new ForemDevConnector());
    this.register(new MastodonConnector());
    this.register(new BlueskyConnector());

    // Feed Connectors
    this.register(new IndexNowConnector());
    this.register(new RSSGeneratorConnector());

    // Assisted Pack Connectors
    this.register(new MediumPackConnector());
    this.register(new PRLogPackConnector());
    this.register(new RedditPackConnector());
    this.register(new HackerNewsPackConnector());
    this.register(new ProductHuntPackConnector());
  }

  /**
   * Register a single connector
   */
  private register(connector: BaseConnector): void {
    const config = connector.getDestinationConfig();
    this.connectors.set(config.key, connector);
    this.connectorConfigs.set(config.key, config);
  }

  /**
   * Get a connector by key
   */
  getConnector(key: string): BaseConnector | undefined {
    return this.connectors.get(key);
  }

  /**
   * Get a connector by name
   */
  getConnectorByName(name: string): BaseConnector | undefined {
    for (const connector of this.connectors.values()) {
      if (connector.getDestinationConfig().name === name) {
        return connector;
      }
    }
    return undefined;
  }

  /**
   * Get a connector's configuration by key
   */
  getConfig(key: string): DestinationConfig | undefined {
    return this.connectorConfigs.get(key);
  }

  /**
   * Get a connector's destination configuration by key (alias for getConfig)
   */
  getDestinationConfig(key: string): DestinationConfig | undefined {
    return this.connectorConfigs.get(key);
  }

  /**
   * Get all available destinations (alias for listConnectors)
   */
  getAllDestinations(): Array<{
    key: string;
    name: string;
    description: string;
    group: string;
    authType: string;
    supportsCanonical: boolean;
  }> {
    return this.listConnectors();
  }

  /**
   * Get all available connectors
   */
  listConnectors(): Array<{
    key: string;
    name: string;
    description: string;
    group: string;
    authType: string;
    supportsCanonical: boolean;
  }> {
    const result = [];
    for (const config of this.connectorConfigs.values()) {
      result.push({
        key: config.key,
        name: config.name,
        description: config.description,
        group: config.group,
        authType: config.authType,
        supportsCanonical: config.supportsCanonical,
      });
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Get connectors by group (api, feed, assist)
   */
  getConnectorsByGroup(group: string): Array<{
    key: string;
    name: string;
    description: string;
  }> {
    const result = [];
    for (const config of this.connectorConfigs.values()) {
      if (config.group === group) {
        result.push({
          key: config.key,
          name: config.name,
          description: config.description,
        });
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Get all API connectors (require authentication)
   */
  getApiConnectors(): Array<{
    key: string;
    name: string;
    description: string;
    authType: string;
  }> {
    return this.getConnectorsByGroup('api').map((c) => ({
      ...c,
      authType: this.connectorConfigs.get(c.key)?.authType || 'unknown',
    }));
  }

  /**
   * Get all Feed connectors
   */
  getFeedConnectors(): Array<{
    key: string;
    name: string;
    description: string;
  }> {
    return this.getConnectorsByGroup('feed');
  }

  /**
   * Get all Assisted Pack connectors
   */
  getAssistedPackConnectors(): Array<{
    key: string;
    name: string;
    description: string;
  }> {
    return this.getConnectorsByGroup('assist');
  }

  /**
   * Check if a connector exists
   */
  hasConnector(key: string): boolean {
    return this.connectors.has(key);
  }

  /**
   * Validate connector configuration
   */
  validateConnectorConfig(key: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.connectors.has(key)) {
      errors.push(`Connector with key "${key}" does not exist`);
    }

    const config = this.connectorConfigs.get(key);
    if (!config) {
      errors.push(`No configuration found for connector "${key}"`);
      return { isValid: false, errors, warnings };
    }

    // Validate required config fields
    if (!config.key || config.key.trim().length === 0) {
      errors.push('Connector config must have a non-empty key');
    }

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Connector config must have a non-empty name');
    }

    if (!config.group || !['api', 'feed', 'assist'].includes(config.group)) {
      errors.push('Connector must belong to group: api, feed, or assist');
    }

    if (!config.authType) {
      warnings.push('Connector has no specified authType');
    }

    // Validate content limits if specified
    if (config.contentLimits) {
      if (config.contentLimits.maxContentLength && config.contentLimits.maxContentLength <= 0) {
        errors.push('contentLimits.maxContentLength must be greater than 0');
      }

      if (!config.contentLimits.supportedFormats || config.contentLimits.supportedFormats.length === 0) {
        warnings.push('No supported content formats specified');
      }
    }

    // Validate rate limits if specified
    if (config.rateLimit) {
      if (config.rateLimit.requests <= 0) {
        errors.push('rateLimit.requests must be greater than 0');
      }

      if (config.rateLimit.periodSeconds <= 0) {
        errors.push('rateLimit.periodSeconds must be greater than 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get connector statistics
   */
  getStats(): {
    total: number;
    byGroup: Record<string, number>;
    requiresAuth: number;
    supportsCanonical: number;
  } {
    const stats = {
      total: this.connectors.size,
      byGroup: {
        api: 0,
        feed: 0,
        assist: 0,
      },
      requiresAuth: 0,
      supportsCanonical: 0,
    };

    for (const config of this.connectorConfigs.values()) {
      if (config.group in stats.byGroup) {
        stats.byGroup[config.group as keyof typeof stats.byGroup]++;
      }

      if (config.authType !== 'none') {
        stats.requiresAuth++;
      }

      if (config.supportsCanonical) {
        stats.supportsCanonical++;
      }
    }

    return stats;
  }

  /**
   * Get connectors that support canonical URLs
   */
  getCanonicalSupportedConnectors(): Array<{
    key: string;
    name: string;
    description: string;
  }> {
    const result = [];
    for (const config of this.connectorConfigs.values()) {
      if (config.supportsCanonical) {
        result.push({
          key: config.key,
          name: config.name,
          description: config.description,
        });
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Get connectors by authentication type
   */
  getConnectorsByAuthType(authType: string): Array<{
    key: string;
    name: string;
    authType: string;
  }> {
    const result = [];
    for (const config of this.connectorConfigs.values()) {
      if (config.authType === authType) {
        result.push({
          key: config.key,
          name: config.name,
          authType: config.authType,
        });
      }
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Get detailed connector information
   */
  getConnectorInfo(key: string): {
    config: DestinationConfig;
    connector: BaseConnector;
  } | null {
    const connector = this.connectors.get(key);
    const config = this.connectorConfigs.get(key);

    if (!connector || !config) {
      return null;
    }

    return { config, connector };
  }

  /**
   * Export registry as JSON (for documentation/debugging)
   */
  toJSON(): Array<{
    key: string;
    name: string;
    description: string;
    group: string;
    authType: string;
    supportsCanonical: boolean;
    contentLimits?: {
      maxTitleLength?: number;
      maxContentLength?: number;
      maxTagsCount?: number;
      supportedFormats?: string[];
    };
    rateLimit?: {
      requests: number;
      periodSeconds: number;
    };
  }> {
    const result = [];
    for (const config of this.connectorConfigs.values()) {
      result.push({
        key: config.key,
        name: config.name,
        description: config.description,
        group: config.group,
        authType: config.authType,
        supportsCanonical: config.supportsCanonical,
        ...(config.contentLimits && { contentLimits: config.contentLimits }),
        ...(config.rateLimit && { rateLimit: config.rateLimit }),
      });
    }
    return result.sort((a, b) => a.key.localeCompare(b.key));
  }
}

// Export singleton instance for convenience
export const connectorRegistry = new ConnectorRegistry();
