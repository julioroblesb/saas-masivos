import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar Service Role Key para poder leer toda la base de datos sin RLS en el cron
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // Opcional: Proteger el endpoint con un Secret de Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Iniciando procesamiento de cola...');

  try {
    // 1. Obtener todas las compañías que tienen sesión "conectado"
    const { data: activeSessions } = await supabaseAdmin
      .from('wa_sessions')
      .select('company_id')
      .eq('status', 'conectado');

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json({ message: 'No hay sesiones activas' });
    }

    const activeCompanyIds = activeSessions.map(s => s.company_id);

    // 2. Buscar hasta 50 mensajes pendientes de campañas 'running'
    const { data: queueItems, error } = await supabaseAdmin
      .from('crm_wa_queue')
      .select(`
        id, company_id, campaign_id, phone, message,
        crm_wa_campaigns!inner ( status )
      `)
      .eq('status', 'pendiente')
      .in('company_id', activeCompanyIds)
      .eq('crm_wa_campaigns.status', 'running')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ message: 'Cola vacía' });
    }

    let sentCount = 0;
    let failedCount = 0;

    // 3. Procesar cada mensaje enviándolo a BuilderBot Cloud
    for (const item of queueItems) {
      const { id, company_id, phone, message, campaign_id } = item;

      try {
        // Marcar como enviando para evitar doble procesamiento si crons se solapan
        await supabaseAdmin.from('crm_wa_queue').update({ status: 'enviando' }).eq('id', id);

        // Obtener host de la sesión
        const { data: session } = await supabaseAdmin
          .from('wa_sessions')
          .select('bb_project_id')
          .eq('company_id', company_id)
          .single();
          
        if (!session?.bb_project_id) throw new Error('No hay bb_project_id en sesión');
        
        // 1. Obtener la IP/Host actual del bot
        const statusRes = await fetch(`${process.env.BUILDERBOT_API_URL || 'https://app.builderbot.cloud/api/v1'}/manager/deploys/${session.bb_project_id}/status`, {
          headers: { 'x-api-builderbot': process.env.BUILDERBOT_API_KEY! }
        });
        const statusData = await statusRes.json();
        
        if (statusData.status !== 'ONLINE' || !statusData.host) {
            throw new Error('El bot no está online o no tiene host asignado');
        }

        const hostUrl = statusData.host.startsWith('http') ? statusData.host : `https://${statusData.host}`;

        // 2. Enviar el mensaje al endpoint del bot desplegado (el host público)
        // Nota: Los deploys de BuilderBot exponen típicamente /v1/messages
        const bbRes = await fetch(`${hostUrl}/v1/messages`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${process.env.BUILDERBOT_API_KEY}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             number: phone,
             text: message
           })
        });
        
        if (!bbRes.ok) throw new Error(`Error en BuilderBot API: ${bbRes.statusText}`);

        // Marcar como enviado
        await supabaseAdmin.from('crm_wa_queue').update({ 
          status: 'enviado',
          sent_at: new Date().toISOString()
        }).eq('id', id);

        await supabaseAdmin.rpc('increment_campaign_sent', { p_campaign_id: campaign_id });
        sentCount++;

      } catch (sendError: any) {
        console.error(`[Cron] Error enviando a ${phone}:`, sendError);
        
        await supabaseAdmin.from('crm_wa_queue').update({ 
          status: 'fallido',
          error_message: sendError.message || String(sendError)
        }).eq('id', id);

        await supabaseAdmin.rpc('increment_campaign_failed', { p_campaign_id: campaign_id });
        failedCount++;
      }
    }

    return NextResponse.json({ 
      message: 'Procesamiento completado',
      processed: queueItems.length,
      sent: sentCount,
      failed: failedCount
    });

  } catch (err: any) {
    console.error('[Cron] Error crítico:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
