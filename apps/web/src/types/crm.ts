export interface CRMMarketingContact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  birthday?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  totalVisits?: number;
  lastServiceName?: string;
}

export interface WaCampaign {
  id: string;
  name: string;
  messageTemplate: any;
  status: 'draft' | 'queued' | 'running' | 'pausada' | 'completed' | 'cancelled' | 'failed';
  total: number;
  sent: number;
  failed: number;
  createdAt: string;
  sequence?: any[]; // JSONb array of messages
  startedAt?: string;
  completedAt?: string;
  targetTag?: string; // used in UI
  repliedCount?: number;
}

export interface WaQueueItem {
  id: string;
  campaignId: string;
  contactId: string;
  phone: string;
  message: string;
  status: 'pendiente' | 'processing' | 'enviado' | 'fallido' | 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  targetContactIds?: string[];
  targetRawPhones?: string[];
  sequence: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    content: string;
    mediaUrl?: string;
    delayAfterMs: number;
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

export interface SpaStaff {
  id: string;
  name: string;
  birthday?: string;
  role?: string;
  isActive: boolean;
  services?: string[]; // array of service IDs or names
}

export interface SpaVisit {
  id: string;
  companyId: string;
  contactId: string;
  serviceId: string;
  staffId?: string;
  status: 'en_curso' | 'completado' | 'cancelado';
  visitDate: string;
  completedAt?: string;
  notes?: string;
  priceCharged?: number;
}