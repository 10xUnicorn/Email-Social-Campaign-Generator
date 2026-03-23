import {
  Campaign,
  ContentAsset,
  DestinationSubmission,
  TrackingLink,
  PublishJob,
} from '@/types/index';
import { v4 as uuidv4 } from 'uuid';

export interface PublishRun {
  id: string;
  campaignId: string;
  orgId: string;
  mode: 'dry_run' | 'live';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  summary?: {
    totalDestinations: number;
    successful: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

/**
 * Mock database for MVP - in-memory store using Maps
 * TODO: Replace with Supabase integration
 */
class MockDatabase {
  private static instance: MockDatabase;

  private campaigns: Map<string, Campaign> = new Map();
  private assets: Map<string, ContentAsset> = new Map();
  private submissions: Map<string, DestinationSubmission> = new Map();
  private runs: Map<string, PublishRun> = new Map();
  private trackingLinks: Map<string, TrackingLink> = new Map();
  private assetsByCampaign: Map<string, string[]> = new Map();
  private submissionsByAsset: Map<string, string[]> = new Map();

  private constructor() {}

  static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  // Campaign operations
  createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Campaign {
    const id = uuidv4();
    const now = new Date();
    const newCampaign: Campaign = {
      ...campaign,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }

  getCampaign(campaignId: string): Campaign | undefined {
    return this.campaigns.get(campaignId);
  }

  listCampaigns(orgId: string): Campaign[] {
    const result: Campaign[] = [];
    for (const campaign of this.campaigns.values()) {
      if (campaign.orgId === orgId) {
        result.push(campaign);
      }
    }
    return result;
  }

  updateCampaign(campaignId: string, updates: Partial<Campaign>): Campaign {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    const updated = { ...campaign, ...updates, updatedAt: new Date() };
    this.campaigns.set(campaignId, updated);
    return updated;
  }

  // Asset operations
  createAsset(asset: Omit<ContentAsset, 'id' | 'createdAt' | 'updatedAt'>): ContentAsset {
    const id = uuidv4();
    const now = new Date();
    const newAsset: ContentAsset = {
      ...asset,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(id, newAsset);

    // Track in campaign index
    const existing = this.assetsByCampaign.get(asset.campaignId) || [];
    this.assetsByCampaign.set(asset.campaignId, [...existing, id]);

    return newAsset;
  }

  getAsset(assetId: string): ContentAsset | undefined {
    return this.assets.get(assetId);
  }

  getAssetsByCampaign(campaignId: string): ContentAsset[] {
    const assetIds = this.assetsByCampaign.get(campaignId) || [];
    return assetIds
      .map((id) => this.assets.get(id))
      .filter((asset) => asset !== undefined) as ContentAsset[];
  }

  updateAsset(assetId: string, updates: Partial<ContentAsset>): ContentAsset {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    const updated = { ...asset, ...updates, updatedAt: new Date() };
    this.assets.set(assetId, updated);
    return updated;
  }

  // Submission operations
  createSubmission(
    submission: Omit<DestinationSubmission, 'id' | 'createdAt' | 'updatedAt'>
  ): DestinationSubmission {
    const id = uuidv4();
    const now = new Date();
    const newSubmission: DestinationSubmission = {
      ...submission,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.submissions.set(id, newSubmission);

    // Track in asset index
    const existing = this.submissionsByAsset.get(submission.assetId) || [];
    this.submissionsByAsset.set(submission.assetId, [...existing, id]);

    return newSubmission;
  }

  getSubmission(submissionId: string): DestinationSubmission | undefined {
    return this.submissions.get(submissionId);
  }

  getSubmissionsByAsset(assetId: string): DestinationSubmission[] {
    const submissionIds = this.submissionsByAsset.get(assetId) || [];
    return submissionIds
      .map((id) => this.submissions.get(id))
      .filter((sub) => sub !== undefined) as DestinationSubmission[];
  }

  getSubmissionsByCampaign(campaignId: string): DestinationSubmission[] {
    const result: DestinationSubmission[] = [];
    for (const submission of this.submissions.values()) {
      if (submission.campaignId === campaignId) {
        result.push(submission);
      }
    }
    return result;
  }

  updateSubmission(submissionId: string, updates: Partial<DestinationSubmission>): DestinationSubmission {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }
    const updated = { ...submission, ...updates, updatedAt: new Date() };
    this.submissions.set(submissionId, updated);
    return updated;
  }

  // Run operations
  createRun(run: Omit<PublishRun, 'id' | 'startedAt'>): PublishRun {
    const id = uuidv4();
    const newRun: PublishRun = {
      ...run,
      id,
      startedAt: new Date(),
    };
    this.runs.set(id, newRun);
    return newRun;
  }

  getRun(runId: string): PublishRun | undefined {
    return this.runs.get(runId);
  }

  getRunsByCampaign(campaignId: string): PublishRun[] {
    const result: PublishRun[] = [];
    for (const run of this.runs.values()) {
      if (run.campaignId === campaignId) {
        result.push(run);
      }
    }
    return result;
  }

  updateRun(runId: string, updates: Partial<PublishRun>): PublishRun {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }
    const updated = { ...run, ...updates };
    this.runs.set(runId, updated);
    return updated;
  }

  // Tracking link operations
  createTrackingLink(link: Omit<TrackingLink, 'id' | 'createdAt'>): TrackingLink {
    const id = uuidv4();
    const newLink: TrackingLink = {
      ...link,
      id,
      createdAt: new Date(),
    };
    this.trackingLinks.set(id, newLink);
    return newLink;
  }

  getTrackingLink(linkId: string): TrackingLink | undefined {
    return this.trackingLinks.get(linkId);
  }

  getTrackingLinksByCampaign(campaignId: string): TrackingLink[] {
    const result: TrackingLink[] = [];
    for (const link of this.trackingLinks.values()) {
      if (link.campaignId === campaignId) {
        result.push(link);
      }
    }
    return result;
  }

  updateTrackingLink(linkId: string, updates: Partial<TrackingLink>): TrackingLink {
    const link = this.trackingLinks.get(linkId);
    if (!link) {
      throw new Error(`Tracking link not found: ${linkId}`);
    }
    const updated = { ...link, ...updates };
    this.trackingLinks.set(linkId, updated);
    return updated;
  }

  // Utility methods
  clear(): void {
    this.campaigns.clear();
    this.assets.clear();
    this.submissions.clear();
    this.runs.clear();
    this.trackingLinks.clear();
    this.assetsByCampaign.clear();
    this.submissionsByAsset.clear();
  }

  getStats(): Record<string, number> {
    return {
      campaigns: this.campaigns.size,
      assets: this.assets.size,
      submissions: this.submissions.size,
      runs: this.runs.size,
      trackingLinks: this.trackingLinks.size,
    };
  }
}

export const mockDb = MockDatabase.getInstance();
