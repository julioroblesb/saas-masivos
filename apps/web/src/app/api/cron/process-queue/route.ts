import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveSpintax } from '../../../../shared/utils/spintax';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function randomDelayMs(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en servidor' }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Iniciando procesamiento de cola concurrente...');

  try {
    // 0. Watchdog: Auto-recuperar mensajes trabados en 'enviando' por más de 5 minutos (Timeout)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from('crm_wa_queue')
      .update({ status: 'pendiente' })
      .eq('status', 'enviando')
      .lte('processing_started_at', fiveMinsAgo);

    // 1. Traer TODAS las empresas conectadas en UNA sola query (no dentro de ningún loop)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('wa_sessions')
      .select('company_id, bb_project_id, next_allowed_send_at')
      .eq('status', 'conectado');

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'No hay sesiones activas' });
    }

    // 2. Procesar CADA empresa EN PARALELO. Ninguna espera a otra.
    const results = await Promise.allSettled(
      sessions.map((session) => processOneCompany(session))
    );

    const summary = results.map((r, i) => ({
      company_id: sessions[i].company_id,
      ...(r.status === 'fulfilled' ? r.value : { error: String((r as PromiseRejectedResult).reason) }),
    }));

    return NextResponse.json({ companies_evaluated: sessions.length, results: summary });

  } catch (globalError: any) {
    console.error('Error fatal en cron:', globalError);
    return NextResponse.json({ error: globalError.message }, { status: 500 });
  }
}

async function processOneCompany(session: {
  company_id: string;
  bb_project_id: string | null;
  next_allowed_send_at: string | null;
}) {
  const { company_id, bb_project_id, next_allowed_send_at } = session;

  if (!bb_project_id) return { skipped: 'sin bb_project_id' };

  // ¿Ya le toca a ESTA empresa enviar? Si no, no se hace NADA con ella en este ciclo.
  if (next_allowed_send_at && new Date(next_allowed_send_at) > new Date()) {
    return { skipped: 'esperando su propio delay anti-baneo' };
  }

  // Tomar SOLO el siguiente mensaje pendiente de ESTA empresa.
  // Realizamos JOIN a crm_wa_campaigns para obtener los delays parametrizados y a companies para settings de Spintax
  const { data: nextItem } = await supabaseAdmin
    .from('crm_wa_queue')
    .select(`
      id, campaign_id, phone, message,
      crm_wa_campaigns!inner(status, min_delay_sec, max_delay_sec),
      companies(settings)
    `)
    .eq('company_id', company_id)
    .eq('status', 'pendiente')
    .eq('crm_wa_campaigns.status', 'running')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextItem) return { skipped: 'sin mensajes pendientes' };

  const { id, campaign_id, phone, message } = nextItem;
  
  // Extraer configuraciones y delays
  const companySettings = (nextItem.companies as any)?.settings || {};
  const campaignData = Array.isArray(nextItem.crm_wa_campaigns) ? nextItem.crm_wa_campaigns[0] : nextItem.crm_wa_campaigns;
  const minDelaySec = campaignData?.min_delay_sec || 45;
  const maxDelaySec = campaignData?.max_delay_sec || 90;

  try {
    await supabaseAdmin.from('crm_wa_queue').update({ status: 'enviando', processing_started_at: new Date().toISOString() }).eq('id', id);

    // Resolver Spintax
    const finalMessage = resolveSpintax(message, companySettings);

    const bbRes = await fetch(`https://app.builderbot.cloud/api/v2/${bb_project_id}/messages`, {
      method: 'POST',
      headers: {
        'x-api-builderbot': process.env.BUILDERBOT_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: phone, messages: { content: finalMessage }, checkIfExists: false }),
    });

    if (!bbRes.ok) throw new Error(`BuilderBot: ${bbRes.statusText}`);

    await supabaseAdmin
      .from('crm_wa_queue')
      .update({ status: 'enviado', sent_at: new Date().toISOString() })
      .eq('id', id);
    await supabaseAdmin.rpc('increment_campaign_sent', { p_campaign_id: campaign_id });

    // Reservar el PRÓXIMO turno de ESTA empresa usando su delay parametrizado
    await supabaseAdmin
      .from('wa_sessions')
      .update({
        last_message_sent_at: new Date().toISOString(),
        next_allowed_send_at: new Date(Date.now() + randomDelayMs(minDelaySec * 1000, maxDelaySec * 1000)).toISOString(),
      })
      .eq('company_id', company_id);

    return { sent: phone };
  } catch (err: any) {
    await supabaseAdmin
      .from('crm_wa_queue')
      .update({ status: 'fallido', error_message: err.message || String(err) })
      .eq('id', id);
    await supabaseAdmin.rpc('increment_campaign_failed', { p_campaign_id: campaign_id });

    // Aunque haya fallado, igual se reserva su próximo turno.
    await supabaseAdmin
      .from('wa_sessions')
      .update({ next_allowed_send_at: new Date(Date.now() + randomDelayMs(minDelaySec * 1000, maxDelaySec * 1000)).toISOString() })
      .eq('company_id', company_id);

    return { failed: phone, error: err.message };
  }
}
