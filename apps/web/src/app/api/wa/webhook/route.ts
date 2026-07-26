import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { secretsMatch } from '@/server/security/secrets';
import { evolutionWebhookSchema, extractEvolutionPhone } from '@/integrations/evolution/webhook';

const MAX_WEBHOOK_BYTES = 1_000_000;

interface ClaimedEvent {
  companyId: string;
  eventId: string;
}

export async function POST(request: Request) {
  const env = getEnv();
  const receivedSecret = request.headers.get('x-evolution-webhook-secret');

  if (!secretsMatch(receivedSecret, env.INTERNAL_TOKEN)) {
    return NextResponse.json({ error: 'Unauthorized webhook call' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = evolutionWebhookSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const body = parsed.data;
  const instanceName = body.instance ?? request.headers.get('x-instance-name') ?? undefined;
  if (!instanceName) {
    return NextResponse.json({ error: 'Instance not resolved for webhook' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  let claimedEvent: ClaimedEvent | null = null;

  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('wa_sessions')
      .select('company_id')
      .eq('bb_project_id', instanceName)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json(
        { error: 'Tenant not resolved for webhook instance' },
        { status: 400 },
      );
    }

    const companyId = session.company_id;
    const claimedCompanyId = request.headers.get('x-company-id');
    if (claimedCompanyId && claimedCompanyId !== companyId) {
      return NextResponse.json({ error: 'Webhook tenant mismatch' }, { status: 403 });
    }

    if (body.data?.key?.fromMe) {
      return NextResponse.json({ message: 'Ignoring outgoing message' });
    }

    const phoneNumber = extractEvolutionPhone(body);
    if (!phoneNumber) {
      return NextResponse.json({
        message: 'No phone number found in payload, ignoring',
      });
    }

    const payloadHash = createHash('sha256').update(rawBody).digest('hex');
    const eventId = (
      body.data?.key?.id ??
      body.messages?.[0]?.key?.id ??
      body.id ??
      payloadHash
    ).slice(0, 512);
    const eventType = (body.event ?? 'MESSAGES_UPSERT').slice(0, 128);
    const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
      'rpc_claim_evolution_webhook',
      {
        p_company_id: companyId,
        p_event_id: eventId,
        p_event_type: eventType,
        p_payload_sha256: payloadHash,
      },
    );
    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json({ success: true, duplicate: true });
    }
    claimedEvent = { companyId, eventId };

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1_000);
    const { data: queueItem, error: queueError } = await supabaseAdmin
      .from('crm_wa_queue')
      .select('id, campaign_id')
      .eq('company_id', companyId)
      .eq('phone', phoneNumber)
      .eq('status', 'enviado')
      .eq('replied', false)
      .gte('sent_at', twoDaysAgo.toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (queueError) throw queueError;

    if (queueItem) {
      const { error: repliedError } = await supabaseAdmin
        .from('crm_wa_queue')
        .update({ replied: true })
        .eq('id', queueItem.id);
      if (repliedError) throw repliedError;

      if (queueItem.campaign_id) {
        const { data: campaign, error: campaignError } = await supabaseAdmin
          .from('crm_wa_campaigns')
          .select('replied_count')
          .eq('id', queueItem.campaign_id)
          .single();
        if (campaignError) throw campaignError;

        const { error: updateCampaignError } = await supabaseAdmin
          .from('crm_wa_campaigns')
          .update({ replied_count: (campaign.replied_count ?? 0) + 1 })
          .eq('id', queueItem.campaign_id);
        if (updateCampaignError) throw updateCampaignError;
      }
    }

    const { error: completeError } = await supabaseAdmin.rpc('rpc_complete_evolution_webhook', {
      p_company_id: companyId,
      p_event_id: eventId,
    });
    if (completeError) throw completeError;
    claimedEvent = null;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (claimedEvent) {
      const { error: releaseError } = await supabaseAdmin
        .from('wa_webhook_events')
        .delete()
        .eq('company_id', claimedEvent.companyId)
        .eq('event_id', claimedEvent.eventId)
        .is('processed_at', null);
      if (releaseError) {
        console.error('Unable to release failed webhook claim', {
          message: releaseError.message,
        });
      }
    }

    console.error('Error processing Evolution webhook', {
      instanceName,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
