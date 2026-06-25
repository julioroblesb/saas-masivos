'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { QrCode, Smartphone, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface WhatsappConnectionProps {
  companyId?: string | null;
}

export function WhatsappConnection({ companyId }: WhatsappConnectionProps) {
  const [status, setStatus] = useState<string>('cargando');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const supabase = createClient();

  // 1. Obtener estado inicial solo al montar
  useEffect(() => {
    if (!companyId) return;

    const fetchStatus = async () => {
      // Obtener estado de la sesión
      const { data } = await supabase
        .from('wa_sessions')
        .select('status')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (data) {
        setStatus(data.status);
      } else {
        setStatus('desconectado');
      }

      // Obtener si es cuenta demo
      const { data: companyData } = await supabase
        .from('companies')
        .select('is_demo')
        .eq('id', companyId)
        .maybeSingle();
        
      if (companyData?.is_demo) {
        setIsDemo(true);
      }
    };

    fetchStatus();
  }, [companyId, supabase]);

  // 2. Suscribirse al QR y polling condicional
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase.channel(`wa_qr_${companyId}`);
    
    channel.on('broadcast', { event: 'qr_update' }, (payload) => {
      setQrCode(payload.payload.qr);
      setStatus('conectando');
    }).subscribe();

    let isMounted = true;
    let interval: NodeJS.Timeout;
    if (status === 'conectando' || status === 'esperando_qr') {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/wa/status');
          if (res.ok && isMounted) {
            const data = await res.json();
            // Use functional state update to avoid closure stale state issues
            setStatus(prev => {
              // If we already aborted/disconnected, don't revert to a connecting state
              if (prev === 'desconectado' || prev === 'cargando') return prev;
              
              if (data.status && data.status !== prev) {
                if (data.status === 'conectado') {
                  setQrCode(null);
                  toast.success('¡WhatsApp conectado exitosamente!');
                }
                return data.status;
              }
              return prev;
            });
            
            if (data.qr && data.qr !== qrCode && isMounted) {
              setQrCode(data.qr);
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 5000);
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [companyId, status, supabase, qrCode]);

  const handleAbort = async () => {
    setStatus('desconectado');
    setQrCode(null);
    try {
      const res = await fetch('/api/wa/disconnect', { method: 'POST' });
      if (!res.ok) {
         console.warn('Error backend al desconectar');
      }
    } catch (err) {
      console.error('Error abortando conexion:', err);
    }
  };

  const handleStartSession = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wa/instance', { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || 'Error al iniciar');
      }
      const data = await res.json();
      setStatus('esperando_qr');
      if (data.qr) {
        setQrCode(data.qr);
      }
      toast.success('Instancia creada, por favor escanea el QR...');
    } catch (err: any) {
      toast.error(err.message || 'Ocurrió un error al conectar con el servidor.');
      setStatus('desconectado');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'cargando') {
    return (
      <div className="flex items-center space-x-2 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Revisando conexión...</span>
      </div>
    );
  }

  const handleDisconnect = async () => {
    if (!confirm('¿Estás seguro de que quieres desvincular este WhatsApp? Se detendrá el envío de campañas y tendrás que volver a escanear el QR si deseas usarlo de nuevo.')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/wa/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Error al desvincular');
      
      setStatus('desconectado');
      setQrCode(null);
      toast.success('WhatsApp desvinculado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al desconectar');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'conectado') {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-full border border-green-200 dark:border-green-900/50">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">WhatsApp Vinculado</span>
        </div>
        <div className="relative group">
          <button 
            type="button"
            onClick={handleDisconnect} 
            disabled={loading || isDemo}
            className={`btn btn-sm ${isDemo ? 'btn-outline-secondary opacity-50 cursor-not-allowed' : 'btn-outline-danger'}`}
          >
            {loading ? 'Desvinculando...' : 'Desvincular'}
          </button>
          {isDemo && (
            <div className="absolute top-full mt-2 w-max max-w-xs p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
              Esta acción está deshabilitada en el modo de demostración.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {status === 'error_desconexion' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl flex flex-col gap-2 max-w-xl">
          <h4 className="m-0 text-[0.9rem] font-bold text-red-900 dark:text-red-300 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Envíos Pausados por Errores
          </h4>
          <p className="m-0 text-[0.8rem] text-red-800 dark:text-red-200/80 leading-relaxed">
            Tu conexión de WhatsApp presentó múltiples errores consecutivos. Por tu seguridad y para evitar bloqueos, el sistema ha frenado automáticamente tus campañas. Por favor, <strong>vuelve a vincular tu WhatsApp</strong> para reanudar los envíos pendientes.
          </p>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {status === 'desconectado' || status === 'error' || status === 'error_desconexion' ? (
          <div className="relative group">
            <Button onClick={handleStartSession} disabled={loading || isDemo} className={`text-white w-fit ${isDemo ? 'bg-slate-400 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-700'}`}>
              <Smartphone className="w-4 h-4 mr-2" />
              {loading ? 'Iniciando...' : 'Vincular WhatsApp'}
            </Button>
            {isDemo && (
              <div className="absolute top-full mt-2 w-max max-w-xs p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
                Esta acción está deshabilitada en el modo de demostración.
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* QR Modal Overlay */}
      {(status === 'conectando' || status === 'esperando_qr') && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] my-auto">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                Vincular Dispositivo
              </h3>
              <button 
                onClick={handleAbort}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"
                title="Cancelar y Cerrar"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              {qrCode ? (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-lg mb-6">
                    <Image src={qrCode} alt="WhatsApp QR Code" width={220} height={220} className="rounded-md" />
                  </div>
                  <div className="text-center text-zinc-600 dark:text-zinc-400 max-w-[260px]">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Abre WhatsApp y escanea</p>
                    <ol className="text-sm space-y-2 text-left list-decimal list-inside">
                      <li>Toca <strong>Menú</strong> o <strong>Configuración</strong></li>
                      <li>Selecciona <strong>Dispositivos Vinculados</strong></li>
                      <li>Toca en <strong>Vincular un Dispositivo</strong></li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-zinc-500 dark:text-zinc-400 animate-pulse">
                  <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                    <QrCode className="w-10 h-10 text-zinc-400" />
                  </div>
                  <Loader2 className="w-6 h-6 animate-spin mb-3 text-green-600" />
                  <span className="text-base font-medium">Generando código seguro...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
