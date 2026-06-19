export interface CRMMarketingContact {
  id: string;
  phone: string;
  name?: string;
  tags: string[];
  createdAt: string;
}

export interface WaCampaign {
  id: string;
  name: string;
  messageTemplate: any;
  status: 'draft' | 'queued' | 'running' | 'paused' | 'completed' | 'cancelled' | 'failed';
  total: number;
  sent: number;
  failed: number;
  createdAt: string;
  sequence?: any[]; // JSONb array of messages
  startedAt?: string;
  completedAt?: string;
  targetTag?: string; // used in UI
}

export interface WaQueueItem {
  id: string;
  campaignId: string;
  contactId: string;
  phone: string;
  message: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  errorMessage?: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  targetTag: string | null;
  sequence: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    content: string;
    mediaUrl?: string;
    delayAfterMs: number;
  }[];
  contacts: {
    phone: string;
    name?: string;
    messages: string[]; // sequence content resolved
  }[];
  minDelaySec: number;
  maxDelaySec: number;
}

export type CampaignMessageSequence = {
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: string;
  mediaUrl?: string;
  delayAfterMs: number;
}[];