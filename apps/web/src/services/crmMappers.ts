import type {
  CampaignStatus,
  CampaignSequenceItem,
  CRMMarketingContact,
  WaCampaign,
  WaQueueItem,
} from '../types/crm';
import type { Json, Tables } from '../types/database.generated';

export type DBMarketingContactRow = Tables<'crm_marketing_contacts'> & {
  last_service_name?: string | null;
};
export type DBWaCampaignRow = Tables<'crm_wa_campaigns'>;
export type DBWaQueueItemRow = Tables<'crm_wa_queue'>;

const CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  'draft',
  'queued',
  'running',
  'pausada',
  'completed',
  'cancelled',
  'failed',
]);

function campaignStatus(value: string): CampaignStatus {
  return CAMPAIGN_STATUSES.has(value as CampaignStatus) ? (value as CampaignStatus) : 'failed';
}

function jsonSequence(value: Json | null): CampaignSequenceItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter(
    (item): item is Record<string, Json | undefined> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item)),
  );
  if (
    !items.every(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.type === 'string' &&
        typeof item.content === 'string' &&
        typeof item.delayAfterMs === 'number',
    )
  ) {
    return undefined;
  }
  return items.map((item) => ({
    id: item.id as string,
    type: item.type as CampaignSequenceItem['type'],
    content: item.content as string,
    delayAfterMs: item.delayAfterMs as number,
    ...(typeof item.mediaUrl === 'string' ? { mediaUrl: item.mediaUrl } : {}),
  }));
}

export function mapMarketingContactFromDB(row: DBMarketingContactRow): CRMMarketingContact {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name || undefined,
    email: row.email || undefined,
    birthday: row.birthday || undefined,
    allergiesAndConditions: row.allergies_and_conditions || undefined,
    preferences: row.preferences || undefined,
    internalNotes: row.internal_notes || undefined,
    totalSpent: row.total_spent ? Number(row.total_spent) : 0,
    totalVisits: row.total_visits || 0,
    lastVisitDate: row.last_visit_date || undefined,
    customerSegment: (row.customer_segment as CRMMarketingContact['customerSegment']) || 'Nuevo',
    tags: row.tags || [],
    createdAt: row.created_at,
    lastServiceName: row.last_service_name || undefined
  };
}

export function mapWaCampaignFromDB(row: DBWaCampaignRow): WaCampaign {
  return {
    id: row.id,
    name: row.name,
    messageTemplate: row.message_template,
    sequence: jsonSequence(row.sequence),
    status: campaignStatus(row.status),
    total: row.total_contacts || 0,
    sent: row.sent_count || 0,
    failed: row.failed_count || 0,
    repliedCount: row.replied_count || 0,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined
  };
}

export function mapWaQueueItemFromDB(row: DBWaQueueItemRow): WaQueueItem {
  return {
    id: row.id,
    campaignId: row.campaign_id ?? undefined,
    contactId: row.contact_id ?? undefined,
    phone: row.phone,
    message: row.message,
    status: row.status as WaQueueItem['status'],
    errorMessage: row.error_message ?? undefined,
    scheduledFor: row.scheduled_for ?? row.created_at,
    sentAt: row.sent_at ?? undefined,
    createdAt: row.created_at
  };
}
