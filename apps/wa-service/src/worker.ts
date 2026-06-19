import { supabaseAdmin } from './supabaseClient';
import { sessions } from './sessions';

// Delay aleatorio para no ser baneado por WhatsApp (ej. 3s - 8s)
const getRandomDelay = (min = 3000, max = 8000) => Math.floor(Math.random() * (max - min + 1) + min);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function startWorker() {
  console.log('[Worker] Iniciando worker de envíos masivos...');
  
  while (true) {
    try {
      await processQueue();
    } catch (err) {
      console.error('[Worker] Error general:', err);
    }
    // Pausa breve entre iteraciones del worker
    await sleep(2000);
  }
}

async function processQueue() {
  // Solo procesar si hay sesiones activas
  if (sessions.size === 0) return;

  // Obtener compañías con sesión activa conectada en memoria
  const activeCompanyIds = Array.from(sessions.keys());

  // Buscar mensajes pendientes de campañas activas para compañías con sesión lista
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
    .limit(50); // Batch de 50 para no ahogar memoria

  if (error) {
    console.error('[Worker] Error al obtener cola:', error);
    return;
  }

  if (!queueItems || queueItems.length === 0) return;

  for (const item of queueItems) {
    const { id, company_id, phone, message, campaign_id } = item;
    const sock = sessions.get(company_id);

    if (!sock) continue; // Por si se desconectó a medio camino

    try {
      // Marcar como enviando (evita doble procesamiento si hay múltiples workers)
      await supabaseAdmin.from('crm_wa_queue').update({ status: 'enviando' }).eq('id', id);

      // Limpiar y formatear número (Baileys usa formato JID, ej. 51999999999@s.whatsapp.net)
      const cleanPhone = phone.replace(/\D/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      // Enviar mensaje
      await sock.sendMessage(jid, { text: message });

      // Marcar como enviado
      await supabaseAdmin.from('crm_wa_queue').update({ 
        status: 'enviado',
        sent_at: new Date().toISOString()
      }).eq('id', id);

      // Incrementar contador de enviados
      await supabaseAdmin.rpc('increment_campaign_sent', { p_campaign_id: campaign_id });

      console.log(`[Worker] Mensaje enviado a ${phone} (Tenant ${company_id})`);

    } catch (sendError: any) {
      console.error(`[Worker] Error enviando a ${phone}:`, sendError);
      
      // Marcar como fallido
      await supabaseAdmin.from('crm_wa_queue').update({ 
        status: 'fallido',
        error_message: sendError?.message || String(sendError)
      }).eq('id', id);

      // Incrementar contador fallidos
      await supabaseAdmin.rpc('increment_campaign_failed', { p_campaign_id: campaign_id });
    }

    // Retraso entre envíos para la MISMA compañía (evitar spam).
    // Nota: en una implementación más compleja, se usarían colas separadas por tenant para no bloquear a un tenant si el otro envía 100 mensajes.
    await sleep(getRandomDelay());
  }
}
