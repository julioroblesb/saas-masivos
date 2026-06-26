import type { CRMMarketingContact, WaCampaign, WaQueueItem } from '../types/crm';

// Mock DB Types para no requerir todos los types generados
export type DBMarketingContactRow = any;
export type DBWaCampaignRow = any;
export type DBWaQueueItemRow = any;

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
    customerSegment: row.customer_segment || 'Nuevo',
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
    targetTag: row.target_tag,
    sequence: row.sequence,
    status: row.status as any,
    total: row.total_contacts || 0,
    sent: row.sent_count || 0,
    failed: row.failed_count || 0,
    repliedCount: row.replied_count || 0,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at
  };
}

export function mapWaQueueItemFromDB(row: DBWaQueueItemRow): WaQueueItem {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    contactId: row.contact_id,
    phone: row.phone,
    message: row.message,
    status: row.status as any,
    errorMessage: row.error_message,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    createdAt: row.created_at
  };
}
