export type CampaignStatus =
  | 'draft'
  | 'queued'
  | 'running'
  | 'pausada'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface CampaignSequenceItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: string;
  mediaUrl?: string;
  delayAfterMs: number;
}

export interface CRMMarketingContact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  birthday?: string;
  allergiesAndConditions?: string;
  preferences?: string;
  internalNotes?: string;
  totalSpent?: number;
  totalVisits?: number;
  lastVisitDate?: string;
  customerSegment?: 'VIP' | 'Frecuente' | 'Nuevo' | 'En Riesgo' | 'Perdido' | 'Ocasional';
  tags: string[];
  createdAt: string;
  lastServiceName?: string;
}

export interface WaCampaign {
  id: string;
  name: string;
  messageTemplate: string;
  status: CampaignStatus;
  total: number;
  sent: number;
  failed: number;
  createdAt: string;
  sequence?: CampaignSequenceItem[];
  startedAt?: string;
  completedAt?: string;
  targetTag?: string;
  repliedCount?: number;
}

export interface WaQueueItem {
  id: string;
  campaignId?: string;
  contactId?: string;
  phone: string;
  message: string;
  status:
    | 'queued'
    | 'leased'
    | 'processing'
    | 'sent'
    | 'retry_scheduled'
    | 'failed'
    | 'dead_letter'
    | 'cancelled';
  errorMessage?: string;
  scheduledFor: string;
  sentAt?: string;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  targetContactIds?: string[];
  targetRawPhones?: string[];
  sequence: Omit<CampaignSequenceItem, 'id'>[];
  minDelaySec: number;
  maxDelaySec: number;
}

export type CampaignMessageSequence = CampaignSequenceItem[];

export interface SpaStaff {
  id: string;
  name: string;
  birthday?: string;
  role?: string;
  isActive: boolean;
  services?: string[];
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
