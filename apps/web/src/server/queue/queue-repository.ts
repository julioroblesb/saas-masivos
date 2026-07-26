import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from '@/types/database.generated';
import type { SpintaxSettings } from '@/shared/utils/spintax';

export type QueueItem = Tables<'crm_wa_queue'>;

export interface QueueMessageContext {
  maxDelaySeconds: number;
  minDelaySeconds: number;
  settings: SpintaxSettings;
}

export interface QueueRepositoryPort {
  claim(companyId: string, workerId: string, allowCampaign: boolean): Promise<QueueItem | null>;
  markProcessing(queueId: string, workerId: string): Promise<boolean>;
  complete(queueId: string, workerId: string, providerMessageId: string | null): Promise<boolean>;
  fail(
    queueId: string,
    workerId: string,
    failure: { code: string; message: string; retryable: boolean },
  ): Promise<string | null>;
  messageContext(item: QueueItem): Promise<QueueMessageContext>;
  recordSuccess(companyId: string, nextAllowedSendAt: Date): Promise<void>;
  recordFailure(companyId: string, nextAllowedSendAt: Date, reason: string): Promise<string | null>;
}

export class QueueRepository implements QueueRepositoryPort {
  constructor(private readonly database: SupabaseClient<Database>) {}

  async claim(
    companyId: string,
    workerId: string,
    allowCampaign: boolean,
  ): Promise<QueueItem | null> {
    const { data, error } = await this.database.rpc('rpc_claim_queue_item', {
      p_allow_campaign: allowCampaign,
      p_company_id: companyId,
      p_lease_seconds: 90,
      p_worker_id: workerId,
    });
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async markProcessing(queueId: string, workerId: string): Promise<boolean> {
    const { data, error } = await this.database.rpc('rpc_mark_queue_processing', {
      p_queue_id: queueId,
      p_worker_id: workerId,
    });
    if (error) throw error;
    return data;
  }

  async complete(
    queueId: string,
    workerId: string,
    providerMessageId: string | null,
  ): Promise<boolean> {
    const { data, error } = await this.database.rpc('rpc_complete_queue_item', {
      p_provider_message_id: providerMessageId ?? undefined,
      p_queue_id: queueId,
      p_worker_id: workerId,
    });
    if (error) throw error;
    return data;
  }

  async fail(
    queueId: string,
    workerId: string,
    failure: {
      code: string;
      message: string;
      retryable: boolean;
    },
  ): Promise<string | null> {
    const { data, error } = await this.database.rpc('rpc_fail_queue_item', {
      p_base_delay_seconds: 30,
      p_error_code: failure.code,
      p_error_message: failure.message,
      p_queue_id: queueId,
      p_retryable: failure.retryable,
      p_worker_id: workerId,
    });
    if (error) throw error;
    return data;
  }

  async messageContext(item: QueueItem): Promise<QueueMessageContext> {
    const [{ data: company, error: companyError }, campaignResult] = await Promise.all([
      this.database.from('companies').select('settings').eq('id', item.company_id).single(),
      item.campaign_id
        ? this.database
            .from('crm_wa_campaigns')
            .select('min_delay_sec, max_delay_sec')
            .eq('id', item.campaign_id)
            .eq('company_id', item.company_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (companyError) throw companyError;
    if (campaignResult.error) throw campaignResult.error;

    return {
      maxDelaySeconds: campaignResult.data?.max_delay_sec ?? 45,
      minDelaySeconds: campaignResult.data?.min_delay_sec ?? 15,
      settings: parseSpintaxSettings(company.settings),
    };
  }

  async recordSuccess(companyId: string, nextAllowedSendAt: Date): Promise<void> {
    const { error } = await this.database.rpc('rpc_record_queue_send_success', {
      p_company_id: companyId,
      p_next_allowed_send_at: nextAllowedSendAt.toISOString(),
    });
    if (error) throw error;
  }

  async recordFailure(
    companyId: string,
    nextAllowedSendAt: Date,
    reason: string,
  ): Promise<string | null> {
    const { data, error } = await this.database.rpc('rpc_record_queue_send_failure', {
      p_company_id: companyId,
      p_next_allowed_send_at: nextAllowedSendAt.toISOString(),
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  }
}

function parseSpintaxSettings(value: Json | null): SpintaxSettings {
  if (!value || Array.isArray(value) || typeof value !== 'object') return {};

  const greetings = stringArray(value.greetings);
  const farewells = stringArray(value.farewells);
  return {
    ...(greetings.length > 0 ? { greetings } : {}),
    ...(farewells.length > 0 ? { farewells } : {}),
  };
}

function stringArray(value: Json | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
