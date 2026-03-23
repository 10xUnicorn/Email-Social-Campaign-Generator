import { DestinationRegistry } from './index';

export const DESTINATION_REGISTRY: DestinationRegistry[] = [
  // CMS API Destinations
  {
    key: 'wordpress_rest',
    name: 'WordPress REST API',
    group: 'api',
    requiredFields: [
      { name: 'siteUrl', type: 'string', required: true, description: 'WordPress site URL' },
      { name: 'apiKey', type: 'string', required: true, description: 'Application password or JWT token' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 10000000,
      maxImageSize: 52428800,
      rateLimit: { requests: 100, period: 'minutes' },
      dailyLimit: 5000,
    },
    supportsCanonical: true,
    description: 'Publish articles directly to WordPress sites via REST API',
  },
  {
    key: 'ghost_admin',
    name: 'Ghost Admin API',
    group: 'api',
    requiredFields: [
      { name: 'siteUrl', type: 'string', required: true, description: 'Ghost site URL' },
      { name: 'apiKey', type: 'string', required: true, description: 'Ghost Admin API key' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 10000000,
      maxImageSize: 52428800,
      rateLimit: { requests: 60, period: 'minutes' },
      dailyLimit: 2000,
    },
    supportsCanonical: true,
    description: 'Distribute content to Ghost publications',
  },
  {
    key: 'blogger',
    name: 'Google Blogger',
    group: 'api',
    requiredFields: [
      { name: 'blogId', type: 'string', required: true, description: 'Blogger blog ID' },
      { name: 'accessToken', type: 'string', required: true, description: 'OAuth 2.0 access token' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 5000000,
      maxImageSize: 10485760,
      rateLimit: { requests: 50, period: 'minutes' },
      dailyLimit: 1000,
    },
    supportsCanonical: true,
    description: 'Publish to Google Blogger blogs',
  },
  {
    key: 'forem_dev',
    name: 'Dev.to / Forem',
    group: 'api',
    requiredFields: [
      { name: 'apiKey', type: 'string', required: true, description: 'Forem API key' },
      { name: 'username', type: 'string', required: false, description: 'Optional: Forem username' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 5000000,
      maxImageSize: 4194304,
      rateLimit: { requests: 30, period: 'minutes' },
      dailyLimit: 500,
    },
    supportsCanonical: true,
    description: 'Publish articles to Dev.to and other Forem communities',
  },
  {
    key: 'hashnode',
    name: 'Hashnode',
    group: 'api',
    requiredFields: [
      { name: 'publicationId', type: 'string', required: true, description: 'Hashnode publication ID' },
      { name: 'accessToken', type: 'string', required: true, description: 'Hashnode API token' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 5000000,
      maxImageSize: 10485760,
      rateLimit: { requests: 50, period: 'minutes' },
      dailyLimit: 500,
    },
    supportsCanonical: true,
    description: 'Distribute content to Hashnode publications',
  },
  {
    key: 'tumblr',
    name: 'Tumblr',
    group: 'api',
    requiredFields: [
      { name: 'blogName', type: 'string', required: true, description: 'Tumblr blog name' },
      { name: 'accessToken', type: 'string', required: true, description: 'OAuth access token' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 2000000,
      maxImageSize: 10485760,
      rateLimit: { requests: 60, period: 'minutes' },
      dailyLimit: 200,
    },
    supportsCanonical: true,
    description: 'Post content to Tumblr blogs',
  },

  // Social Media Destinations
  {
    key: 'mastodon',
    name: 'Mastodon',
    group: 'api',
    requiredFields: [
      { name: 'instanceUrl', type: 'string', required: true, description: 'Mastodon instance URL' },
      { name: 'accessToken', type: 'string', required: true, description: 'OAuth access token' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 500000,
      maxImageSize: 10485760,
      rateLimit: { requests: 300, period: 'minutes' },
      dailyLimit: 2000,
    },
    supportsCanonical: true,
    description: 'Share and discuss content on Mastodon',
  },
  {
    key: 'bluesky',
    name: 'Bluesky',
    group: 'api',
    requiredFields: [
      { name: 'handle', type: 'string', required: true, description: 'Bluesky handle' },
      { name: 'appPassword', type: 'string', required: true, description: 'Bluesky app password' },
    ],
    authType: 'basic',
    limits: {
      maxContentLength: 300000,
      maxImageSize: 10485760,
      rateLimit: { requests: 300, period: 'minutes' },
      dailyLimit: 2000,
    },
    supportsCanonical: true,
    description: 'Post content to Bluesky',
  },
  {
    key: 'linkedin_ugc',
    name: 'LinkedIn (Organic)',
    group: 'assist',
    requiredFields: [
      { name: 'linkedinUrl', type: 'string', required: true, description: 'LinkedIn profile URL' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 3000,
      rateLimit: { requests: 10, period: 'hours' },
      dailyLimit: 50,
    },
    supportsCanonical: true,
    description: 'Guided publishing to LinkedIn personal profile',
  },
  {
    key: 'youtube_upload',
    name: 'YouTube',
    group: 'api',
    requiredFields: [
      { name: 'channelId', type: 'string', required: true, description: 'YouTube channel ID' },
      { name: 'accessToken', type: 'string', required: true, description: 'OAuth access token' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 5000,
      maxImageSize: 10485760,
      rateLimit: { requests: 100, period: 'days' },
      dailyLimit: 100,
    },
    supportsCanonical: false,
    description: 'Upload videos and manage metadata on YouTube',
  },

  // Search Engine and URL Submission
  {
    key: 'indexnow',
    name: 'IndexNow',
    group: 'api',
    requiredFields: [
      { name: 'apiKey', type: 'string', required: true, description: 'IndexNow API key' },
      { name: 'domain', type: 'string', required: true, description: 'Domain to index' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 10000,
      rateLimit: { requests: 1000, period: 'hours' },
      dailyLimit: 10000,
    },
    supportsCanonical: false,
    description: 'Submit URLs to IndexNow for instant indexing',
  },
  {
    key: 'search_console_sitemaps',
    name: 'Google Search Console',
    group: 'api',
    requiredFields: [
      { name: 'siteUrl', type: 'string', required: true, description: 'Verified site URL in GSC' },
      { name: 'accessToken', type: 'string', required: true, description: 'OAuth access token' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 50000,
      rateLimit: { requests: 600, period: 'minutes' },
      dailyLimit: 5000,
    },
    supportsCanonical: false,
    description: 'Submit sitemaps and URLs to Google Search Console',
  },
  {
    key: 'bing_url_submission',
    name: 'Bing Webmaster Tools',
    group: 'api',
    requiredFields: [
      { name: 'apiKey', type: 'string', required: true, description: 'Bing URL Submission API key' },
      { name: 'siteUrl', type: 'string', required: true, description: 'Site URL registered in Bing' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 50000,
      rateLimit: { requests: 500, period: 'hours' },
      dailyLimit: 2000,
    },
    supportsCanonical: false,
    description: 'Submit URLs to Bing Webmaster Tools',
  },

  // Feed and Distribution
  {
    key: 'flipboard_rss',
    name: 'Flipboard',
    group: 'feed',
    requiredFields: [
      { name: 'flipboardUrl', type: 'string', required: true, description: 'Flipboard magazine URL' },
      { name: 'rssUrl', type: 'string', required: true, description: 'RSS feed URL to track' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 10000000,
      rateLimit: { requests: 1000, period: 'hours' },
      dailyLimit: 10000,
    },
    supportsCanonical: false,
    description: 'Distribute content via Flipboard RSS integration',
  },
  {
    key: 'websub',
    name: 'WebSub / PubSubHubbub',
    group: 'feed',
    requiredFields: [
      { name: 'hubUrl', type: 'string', required: true, description: 'WebSub hub URL' },
      { name: 'topicUrl', type: 'string', required: true, description: 'Topic URL (feed URL)' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 10000000,
      rateLimit: { requests: 5000, period: 'hours' },
      dailyLimit: 50000,
    },
    supportsCanonical: false,
    description: 'Push feed updates via WebSub protocol',
  },

  // Curation Platforms
  {
    key: 'medium_import',
    name: 'Medium',
    group: 'api',
    requiredFields: [
      { name: 'integrationToken', type: 'string', required: true, description: 'Medium integration token' },
      { name: 'username', type: 'string', required: true, description: 'Medium username' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 5000000,
      maxImageSize: 10485760,
      rateLimit: { requests: 50, period: 'hours' },
      dailyLimit: 100,
    },
    supportsCanonical: true,
    description: 'Publish articles to Medium publications',
  },
  {
    key: 'substack',
    name: 'Substack',
    group: 'assist',
    requiredFields: [
      { name: 'substackUrl', type: 'string', required: true, description: 'Substack publication URL' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 10000000,
      rateLimit: { requests: 10, period: 'hours' },
      dailyLimit: 50,
    },
    supportsCanonical: true,
    description: 'Guided publishing to Substack newsletters',
  },
  {
    key: 'reddit',
    name: 'Reddit',
    group: 'api',
    requiredFields: [
      { name: 'subreddits', type: 'string', required: true, description: 'Target subreddit(s)' },
      { name: 'clientId', type: 'string', required: true, description: 'Reddit app client ID' },
      { name: 'clientSecret', type: 'string', required: true, description: 'Reddit app client secret' },
      { name: 'username', type: 'string', required: true, description: 'Reddit username' },
      { name: 'password', type: 'string', required: true, description: 'Reddit password' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 10000,
      rateLimit: { requests: 60, period: 'minutes' },
      dailyLimit: 500,
    },
    supportsCanonical: true,
    description: 'Share and promote content on Reddit',
  },
  {
    key: 'hackernews',
    name: 'Hacker News',
    group: 'assist',
    requiredFields: [
      { name: 'username', type: 'string', required: true, description: 'Hacker News username' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 80000,
      rateLimit: { requests: 5, period: 'hours' },
      dailyLimit: 20,
    },
    supportsCanonical: true,
    description: 'Guided submission to Hacker News',
  },
  {
    key: 'producthunt',
    name: 'Product Hunt',
    group: 'assist',
    requiredFields: [
      { name: 'username', type: 'string', required: true, description: 'Product Hunt username' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 5000,
      rateLimit: { requests: 1, period: 'days' },
      dailyLimit: 5,
    },
    supportsCanonical: true,
    description: 'Guided submission to Product Hunt',
  },

  // Press Release Newswires
  {
    key: 'prlog',
    name: 'PR Log',
    group: 'api',
    requiredFields: [
      { name: 'accountId', type: 'string', required: true, description: 'PR Log account ID' },
      { name: 'apiKey', type: 'string', required: true, description: 'PR Log API key' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 5000,
      maxImageSize: 10485760,
      rateLimit: { requests: 100, period: 'days' },
      dailyLimit: 100,
    },
    supportsCanonical: true,
    description: 'Distribute press releases via PR Log',
  },
  {
    key: 'openpr',
    name: 'openPR',
    group: 'api',
    requiredFields: [
      { name: 'apiKey', type: 'string', required: true, description: 'openPR API key' },
    ],
    authType: 'apikey',
    limits: {
      maxContentLength: 5000,
      maxImageSize: 10485760,
      rateLimit: { requests: 100, period: 'days' },
      dailyLimit: 100,
    },
    supportsCanonical: true,
    description: 'Distribute press releases via openPR newswire',
  },
  {
    key: '1888pressrelease',
    name: '1888 Press Release',
    group: 'assist',
    requiredFields: [
      { name: 'username', type: 'string', required: true, description: '1888 Press Release username' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 5000,
      rateLimit: { requests: 50, period: 'days' },
      dailyLimit: 100,
    },
    supportsCanonical: true,
    description: 'Guided press release distribution via 1888 Press Release',
  },

  // Podcast and Audio
  {
    key: 'apple_podcasts',
    name: 'Apple Podcasts',
    group: 'feed',
    requiredFields: [
      { name: 'feedUrl', type: 'string', required: true, description: 'Podcast RSS feed URL' },
    ],
    authType: 'none',
    limits: {
      maxContentLength: 10000000,
      rateLimit: { requests: 100, period: 'days' },
      dailyLimit: 500,
    },
    supportsCanonical: false,
    description: 'Submit and manage podcast on Apple Podcasts',
  },
  {
    key: 'spotify_rss',
    name: 'Spotify for Podcasters',
    group: 'feed',
    requiredFields: [
      { name: 'feedUrl', type: 'string', required: true, description: 'Podcast RSS feed URL' },
      { name: 'accessToken', type: 'string', required: true, description: 'Spotify API access token' },
    ],
    authType: 'oauth',
    limits: {
      maxContentLength: 10000000,
      rateLimit: { requests: 1000, period: 'hours' },
      dailyLimit: 10000,
    },
    supportsCanonical: false,
    description: 'Manage podcast distribution via Spotify for Podcasters',
  },
];
