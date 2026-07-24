import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '@/config/env';

export async function POST(req: Request) {
  try {
    const env = getEnv();
    const receivedSecret = req.headers.get('x-evolution-webhook-secret');
    
    if (receivedSecret !== env.INTERNAL_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized webhook call' }, { status: 401 });
    }

    const body = await req.json();

    // Ignorar si el mensaje fue enviado por el propio usuario (fromMe)
    if (body.data?.key?.fromMe) {
      return NextResponse.json({ message: 'Ignoring outgoing message' });
    }

    const instanceName = body.instance || req.headers.get('x-instance-name');
    let companyId = req.headers.get('x-company-id');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Buscar company_id en wa_sessions por match exacto de instanceName si no viene en cabecera
    if (!companyId && instanceName) {
      const { data: session } = await supabaseAdmin
        .from('wa_sessions')
        .select('company_id')
        .eq('bb_project_id', instanceName)
        .maybeSingle();

      if (session) {
        companyId = session.company_id;
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Tenant not resolved for webhook instance' }, { status: 400 });
    }

    // Extraer número de teléfono del webhook de Evolution API / Baileys
    let phoneNumber = '';
    
    if (body.data?.key?.remoteJid) {
      phoneNumber = body.data.key.remoteJid.split('@')[0];
    } else if (body.from) {
      phoneNumber = body.from.split('@')[0];
    } else if (body.messages && body.messages.length > 0) {
      const rawJid = body.messages[0].from || body.messages[0].key?.remoteJid;
      phoneNumber = rawJid ? rawJid.split('@')[0] : '';
    } else if (body.phone) {
      phoneNumber = body.phone;
    }

    if (!phoneNumber) {
      return NextResponse.json({ message: 'No phone number found in payload, ignoring' });
    }

    // Buscar si a este número se le envió un mensaje de campaña en las últimas 48 horas
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const { data: queueItem } = await supabaseAdmin
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

    if (queueItem) {
      await supabaseAdmin
        .from('crm_wa_queue')
        .update({ replied: true })
        .eq('id', queueItem.id);

      const { data: campaign } = await supabaseAdmin
        .from('crm_wa_campaigns')
        .select('replied_count')
        .eq('id', queueItem.campaign_id)
        .single();
        
      if (campaign) {
        await supabaseAdmin
          .from('crm_wa_campaigns')
          .update({ replied_count: (campaign.replied_count || 0) + 1 })
          .eq('id', queueItem.campaign_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: error.message || 'Error en webhook' }, { status: 500 });
  }
}
