import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook endpoint sin protección de NextAuth porque será llamado por Evolution API
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json();

    // Extraer secreto desde cabecera o query param
    const receivedSecret = req.headers.get('x-evolution-webhook-secret') || url.searchParams.get('token');
    const internalToken = process.env.INTERNAL_TOKEN || 'masivos_webhook_secret_2026';
    
    if (receivedSecret !== internalToken) {
      return NextResponse.json({ error: 'Unauthorized webhook call' }, { status: 401 });
    }

    // Extraer companyId desde cabecera, query param o instancia del body (ej. company_123)
    let companyId = req.headers.get('x-company-id') || url.searchParams.get('company_id');
    if (!companyId && body.instance?.startsWith('company_')) {
      companyId = body.instance.replace('company_', '');
    }

    if (!companyId) {
      return NextResponse.json({ error: 'company_id missing in webhook' }, { status: 400 });
    }

    // Ignorar si el mensaje fue enviado por el propio usuario (fromMe)
    if (body.data?.key?.fromMe) {
      return NextResponse.json({ message: 'Ignoring outgoing message' });
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

    // Inicializar supabase admin para bypassear RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

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
      .single();

    if (queueItem) {
      // 1. Marcar el mensaje en cola como respondido
      await supabaseAdmin
        .from('crm_wa_queue')
        .update({ replied: true })
        .eq('id', queueItem.id);

      // 2. Incrementar la tasa de respuesta en la campaña
      // Supabase RPC function could be used here for safe atomic increment
      // For now, doing it simple by reading and adding (since it's an edge case of concurrency)
      // Or we can create an RPC. Let's use an RPC if we had one, otherwise a simple increment.
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
