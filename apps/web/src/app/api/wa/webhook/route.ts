import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook endpoint sin protección de NextAuth porque será llamado por BuilderBot
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'company_id missing in query params' }, { status: 400 });
    }

    const body = await req.json();

    // Extraer número de teléfono del webhook (Depende del formato del payload de Builderbot / Baileys)
    // Usualmente envían un payload con { from: '...', body: '...' } o { messages: [...] }
    let phoneNumber = '';
    
    // Tratamos de buscar de diferentes formas comunes de webhooks
    if (body.from) {
      phoneNumber = body.from.replace('@s.whatsapp.net', '');
    } else if (body.messages && body.messages.length > 0) {
      phoneNumber = body.messages[0].from?.replace('@s.whatsapp.net', '') || body.messages[0].key?.remoteJid?.replace('@s.whatsapp.net', '');
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
