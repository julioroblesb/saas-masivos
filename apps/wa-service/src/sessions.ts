import makeWASocket, { 
  DisconnectReason, 
  initAuthCreds, 
  BufferJSON, 
  isJidGroup, 
  isJidBroadcast,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import NodeCache from 'node-cache';
import pino from 'pino';
import { supabaseAdmin } from './supabaseClient';

export const sessions = new Map<string, any>(); // company_id -> socket
export const sessionCaches = new Map<string, {
  msgRetryCounterCache: NodeCache;
  userDevicesCache: NodeCache;
  messageCache: NodeCache;
}>(); // company_id -> caches

export const reconnectStats = new Map<string, { attempts: number }>();

// Logger silencioso para Baileys para no saturar consola
const loggerBaileys = pino({ level: 'silent' }) as any;

// Carga o inicializa credenciales desde Supabase
async function loadAuthStateFromSupabase(companyId: string) {
  let creds: any;
  let keys: any = {};

  const { data, error } = await supabaseAdmin
    .from('wa_auth_state')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (data && data.creds) {
    creds = JSON.parse(JSON.stringify(data.creds), BufferJSON.reviver);
    keys = JSON.parse(JSON.stringify(data.keys || {}), BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  const saveCreds = async () => {
    const credsToSave = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    const keysToSave = JSON.parse(JSON.stringify(keys, BufferJSON.replacer));
    
    await supabaseAdmin
      .from('wa_auth_state')
      .upsert({
        company_id: companyId,
        creds: credsToSave,
        keys: keysToSave,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });
  };

  return {
    state: {
      creds,
      keys: {
        get: (type: string, ids: string[]) => {
          const key = keys[type];
          return ids.reduce((dict: any, id) => {
            let value = key?.[id];
            if (value) {
              if (type === 'app-state-sync-key') {
                value = (makeWASocket as any).proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              dict[id] = value;
            }
            return dict;
          }, {});
        },
        set: (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              keys[category] = keys[category] || {};
              if (value) {
                keys[category][id] = value;
              } else {
                delete keys[category][id];
              }
            }
          }
          saveCreds();
        }
      }
    },
    saveCreds
  };
}

async function updateSessionStatus(companyId: string, status: string, phone_number: string | null = null, last_disconnect_reason: string | null = null) {
  const payload: any = {
    company_id: companyId,
    status,
    updated_at: new Date().toISOString()
  };
  
  if (phone_number) payload.phone_number = phone_number.split(':')[0]; // limpia el ID
  if (last_disconnect_reason) payload.last_disconnect_reason = last_disconnect_reason;

  await supabaseAdmin.from('wa_sessions').upsert(payload, { onConflict: 'company_id' });
}

async function publishQrToFrontend(companyId: string, qrImage: string) {
  const channel = supabaseAdmin.channel(`wa_qr_${companyId}`);
  await channel.send({
    type: 'broadcast',
    event: 'qr_update',
    payload: { qr: qrImage }
  });
}

function initCaches(companyId: string) {
  if (sessionCaches.has(companyId)) {
    return sessionCaches.get(companyId)!;
  }
  
  const caches = {
    msgRetryCounterCache: new NodeCache({ stdTTL: 1800, checkperiod: 300, useClones: false }),
    userDevicesCache: new NodeCache({ stdTTL: 7200, checkperiod: 600, useClones: false }),
    messageCache: new NodeCache({ stdTTL: 43200, checkperiod: 1800, useClones: false })
  };
  sessionCaches.set(companyId, caches);
  return caches;
}

function cleanupSession(companyId: string) {
  if (sessionCaches.has(companyId)) {
    const caches = sessionCaches.get(companyId)!;
    caches.msgRetryCounterCache.close();
    caches.userDevicesCache.close();
    caches.messageCache.close();
    sessionCaches.delete(companyId);
  }
  sessions.delete(companyId);
  reconnectStats.delete(companyId);
}

export async function startSession(companyId: string) {
  if (sessions.has(companyId)) {
    console.log(`[Baileys] Session already exists for tenant ${companyId}`);
    return sessions.get(companyId);
  }

  const { state, saveCreds } = await loadAuthStateFromSupabase(companyId);
  const caches = initCaches(companyId);

  const sock = makeWASocket({ 
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, loggerBaileys)
    },
    logger: loggerBaileys,
    printQRInTerminal: true, 
    browser: ['Masivos SaaS', 'Chrome', '1.0.0'],
    
    // Mejoras BuilderBot de Estabilidad y Optimizacion
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    emitOwnEvents: true, // Cambiado a true para que los mensajes enviados se vean en el celular
    retryRequestDelayMs: 1000, 
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 10_000,
    qrTimeout: 40_000,
    defaultQueryTimeoutMs: 60_000,
    
    // Asignación de Cachés para prevenir Memory Leaks
    msgRetryCounterCache: caches.msgRetryCounterCache,
    userDevicesCache: caches.userDevicesCache as any,
    getMessage: async (key) => {
      if (key.id) {
        return caches.messageCache.get(key.id) || undefined;
      }
      return undefined;
    },

    // Filtro crítico para SaaS Masivo: Ignorar Grupos
    shouldIgnoreJid: (jid: string) => {
      return isJidGroup(jid) || isJidBroadcast(jid);
    }
  });
  
  sessions.set(companyId, sock);

  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.id && msg.message) {
        caches.messageCache.set(msg.key.id, msg.message);
      }
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrImage = await QRCode.toDataURL(qr);
      await publishQrToFrontend(companyId, qrImage);
      await updateSessionStatus(companyId, 'conectando');
    }

    if (connection === 'open') {
      console.log(`[Baileys] Conectado exitosamente para tenant ${companyId}`);
      reconnectStats.set(companyId, { attempts: 0 }); // reset attempts
      await updateSessionStatus(companyId, 'conectado', sock.user?.id);
    }

    if (connection === 'close') {
      const error = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log(`[Baileys] Conexión cerrada para tenant ${companyId}, razón:`, error);
      
      const reason = String(error);
      
      if (error === DisconnectReason.loggedOut) {
        console.log(`[Baileys] Tenant ${companyId} cerró sesión. Borrando credenciales...`);
        cleanupSession(companyId);
        await supabaseAdmin.from('wa_auth_state').delete().eq('company_id', companyId);
        await updateSessionStatus(companyId, 'desconectado');
      } else {
        await updateSessionStatus(companyId, 'reconectando', null, reason);
        sessions.delete(companyId); // Delete old socket

        // Logica de Reconnection Backoff
        const stats = reconnectStats.get(companyId) || { attempts: 0 };
        stats.attempts += 1;
        reconnectStats.set(companyId, stats);

        // Max 60 segundos de backoff
        const delay = Math.min(stats.attempts * 5000, 60000); 
        console.log(`[Baileys] Reintentando tenant ${companyId} en ${delay}ms (Intento ${stats.attempts})`);

        setTimeout(() => startSession(companyId), delay);
      }
    }
  });

  return sock;
}
