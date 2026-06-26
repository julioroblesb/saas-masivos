export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resolveSpintax } from '../../../../shared/utils/spintax';

// Jitter Gaussiano (Box-Muller Transform) para simular pausas humanas reales
function randomDelayMs(min: number, max: number) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) num = Math.random(); // resample between 0 and 1
  return min + num * (max - min);
}

export async function GET(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const authHeader = req.headers.get('authorization');
  const { searchParams } = new URL(req.url);
  const tokenParam = searchParams.get('token');
  const CRON_SECRET = process.env.CRON_SECRET;
  
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en servidor' }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${CRON_SECRET}` && tokenParam !== CRON_SECRET) {
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

    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('wa_sessions')
      .select('company_id, bb_project_id, next_allowed_send_at, connection_started_at, daily_sent_count, daily_reset_at, consecutive_errors, companies!inner(status, subscription_end_at)')
      .eq('status', 'conectado')
      .eq('companies.status', 'activa')
      .gte('companies.subscription_end_at', new Date().toISOString());

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ message: 'No hay sesiones activas' });
    }

    // 2. Procesar en lotes (chunks) para no ahogar los sockets y la RAM (Escalabilidad)
    const CHUNK_SIZE = 5;
    const results: PromiseSettledResult<any>[] = [];
    
    for (let i = 0; i < sessions.length; i += CHUNK_SIZE) {
      const chunk = sessions.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.allSettled(
        chunk.map((session) => processOneCompany(supabaseAdmin, session))
      );
      results.push(...chunkResults);
    }

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

async function processOneCompany(supabaseAdmin: SupabaseClient, session: {
  company_id: string;
  bb_project_id: string | null;
  next_allowed_send_at: string | null;
  connection_started_at: string | null;
  daily_sent_count: number;
  daily_reset_at: string | null;
  consecutive_errors: number;
}) {
  const { 
    company_id, 
    bb_project_id, 
    next_allowed_send_at,
    connection_started_at,
    daily_sent_count,
    daily_reset_at,
    consecutive_errors
  } = session;

  if (!bb_project_id) return { skipped: 'sin bb_project_id' };

  // 1. Obtenemos hora actual (para restringir campañas masivas después)
  const now = new Date();
  const limaTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Lima' });
  const limaTime = new Date(limaTimeStr);
  const currentHour = limaTime.getHours();

  // 2. Warm-up & Límites Diarios
  let currentDailyCount = daily_sent_count || 0;
  let currentResetAt = daily_reset_at ? new Date(daily_reset_at) : new Date(0);

  if (now.getTime() - currentResetAt.getTime() >= 24 * 60 * 60 * 1000) {
    currentDailyCount = 0;
    currentResetAt = now;
  }

  const startedAt = connection_started_at ? new Date(connection_started_at) : now;
  const daysActive = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24));
  
  let maxDailyLimit = 500;
  if (daysActive <= 2) maxDailyLimit = 50;
  else if (daysActive <= 6) maxDailyLimit = 150;
  else if (daysActive <= 13) maxDailyLimit = 300;

  let localNextAllowedSendAt = next_allowed_send_at ? new Date(next_allowed_send_at) : new Date(0);
  const runStartTime = Date.now();
  let processedCount = 0;

  // Lazo para procesar la cola. Máximo 45 segundos para evitar el timeout de Vercel.
  while (Date.now() - runStartTime < 45000) {
    const loopNow = new Date();

    if (localNextAllowedSendAt > loopNow) {
      const waitMs = localNextAllowedSendAt.getTime() - loopNow.getTime();
      if (waitMs > 8000) {
        // Si el delay es mayor a 8 segundos, mejor dejamos que el próximo cron (en 1 min) lo procese
        break;
      } else {
        // Si es un delay corto (ej. secuencia de 3s), esperamos aquí mismo
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    let nextItem: any = null;

    // Primero intentamos sacar un mensaje automático pendiente (campaign_id IS NULL)
    const { data: automatedItem } = await supabaseAdmin
      .from('crm_wa_queue')
      .select('id, phone, message, delay_after_ms, companies(settings)')
      .eq('company_id', company_id)
      .eq('status', 'pendiente')
      .is('campaign_id', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (automatedItem) {
      nextItem = {
        ...automatedItem,
        campaign_id: null,
        media_url: null,
        crm_wa_campaigns: { min_delay_sec: 15, max_delay_sec: 45 } // Delays predeterminados para automáticos
      };
    } else {
      // Si no hay automáticos, verificamos límites y horario antes de sacar masivos
      if (currentDailyCount >= maxDailyLimit) {
        break; // Límite diario alcanzado para campañas masivas
      }
      if (currentHour < 8 || currentHour >= 20) {
        break; // Fuera de horario comercial para campañas masivas (08:00-20:00 PET)
      }

      // Si estamos en horario, sacamos de la cola de campañas masivas
      const { data: queueItem } = await supabaseAdmin
        .from('crm_wa_queue')
        .select(`
          id, campaign_id, phone, message, delay_after_ms,
          crm_wa_campaigns!inner(status, min_delay_sec, max_delay_sec),
          companies(settings)
        `)
        .eq('company_id', company_id)
        .eq('status', 'pendiente')
        .eq('crm_wa_campaigns.status', 'running')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      nextItem = queueItem;
    }

    if (!nextItem) break;

    const { id, campaign_id, phone, message, delay_after_ms, media_url } = nextItem;
    
    const companySettings = (nextItem.companies as any)?.settings || {};
    const campaignData = Array.isArray(nextItem.crm_wa_campaigns) ? nextItem.crm_wa_campaigns[0] : nextItem.crm_wa_campaigns;
    const minDelaySec = campaignData?.min_delay_sec || 45;
    const maxDelaySec = campaignData?.max_delay_sec || 90;

    let nextLockDelayMs = 0;
    let isSequence = false;
    if (delay_after_ms !== null && delay_after_ms !== undefined) {
      nextLockDelayMs = delay_after_ms; 
      isSequence = true;
    } else {
      nextLockDelayMs = randomDelayMs(minDelaySec * 1000, maxDelaySec * 1000); 
    }

    try {
      await supabaseAdmin.from('crm_wa_queue').update({ status: 'enviando', processing_started_at: new Date().toISOString() }).eq('id', id);

      const finalMessage = resolveSpintax(message, companySettings);

      const bbPayload: any = {
        number: phone, 
        options: { presence: 'composing', delay: 2000 }, // BuilderBot mostrará "escribiendo..." 2 segundos
        messages: { content: finalMessage }, 
        checkIfExists: true 
      };

      if (media_url) {
        bbPayload.urlMedia = media_url;
      }

      // Usar options de BuilderBot para mostrar "Escribiendo..." y delay nativo
      const bbRes = await fetch(`https://app.builderbot.cloud/api/v2/${bb_project_id}/messages`, {
        method: 'POST',
        headers: {
          'x-api-builderbot': process.env.BUILDERBOT_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bbPayload),
      });

      if (!bbRes.ok) throw new Error(`BuilderBot: ${bbRes.statusText}`);

      await supabaseAdmin
        .from('crm_wa_queue')
        .update({ status: 'enviado', sent_at: new Date().toISOString() })
        .eq('id', id);
        
      if (campaign_id) {
        await supabaseAdmin.rpc('increment_campaign_sent', { p_campaign_id: campaign_id });
      }

      processedCount++;
      currentDailyCount++;

      // Configurar el tiempo para el siguiente mensaje
      localNextAllowedSendAt = new Date(Date.now() + nextLockDelayMs);
      
      await supabaseAdmin
        .from('wa_sessions')
        .update({
          last_message_sent_at: new Date().toISOString(),
          next_allowed_send_at: localNextAllowedSendAt.toISOString(),
          daily_sent_count: currentDailyCount,
          daily_reset_at: currentResetAt.toISOString(),
          consecutive_errors: 0
        })
        .eq('company_id', company_id);

    } catch (err: any) {
      await supabaseAdmin
        .from('crm_wa_queue')
        .update({ status: 'fallido', error_message: err.message || String(err) })
        .eq('id', id);
        
      if (campaign_id) {
        await supabaseAdmin.rpc('increment_campaign_failed', { p_campaign_id: campaign_id });
      }

      const newErrorsCount = consecutive_errors + 1;
      let newSessionStatus = 'conectado';
      
      if (newErrorsCount >= 3) {
        newSessionStatus = 'error_desconexion';
      }

      localNextAllowedSendAt = new Date(Date.now() + nextLockDelayMs);

      await supabaseAdmin
        .from('wa_sessions')
        .update({ 
          consecutive_errors: newSessionStatus === 'error_desconexion' ? 0 : newErrorsCount,
          status: newSessionStatus,
          next_allowed_send_at: localNextAllowedSendAt.toISOString() 
        })
        .eq('company_id', company_id);

      break; // Detener el loop si hay error
    }
  }

  return { processed: processedCount };
}
