'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { QrCode, Smartphone, Loader2, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
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
  const [qrTimedOut, setQrTimedOut] = useState(false);
  const pollCountRef = useRef(0);
  const supabase = createClient();

  // 1. Obtener estado inicial solo al montar
  useEffect(() => {
    if (!companyId) return;

    const fetchStatus = async () => {
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

  // 2. Polling controlado: 3s intervalo, máximo 20 intentos (60s)
  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;
    let interval: NodeJS.Timeout;

    if (status === 'conectando' || status === 'esperando_qr' || status === 'generando_qr' || status === 'provisionando') {
      if (qrTimedOut) return;

      pollCountRef.current = 0;

      interval = setInterval(async () => {
        if (!isMounted) return;

        pollCountRef.current += 1;
        if (pollCountRef.current > 20) {
          clearInterval(interval);
          setQrTimedOut(true);
          return;
        }

        try {
          const res = await fetch('/api/wa/status');
          if (res.ok && isMounted) {
            const data = await res.json();

            setStatus(prev => {
              if (prev === 'desconectado' || prev === 'cargando') return prev;
              
              if (data.status && data.status !== prev) {
                if (data.status === 'conectado') {
                  setQrCode(null);
                  setQrTimedOut(false);
                  toast.success('¡WhatsApp conectado exitosamente!');
                }
                return data.status;
              }
              return prev;
            });
            
            if (data.qr && isMounted) {
              setQrCode(data.qr);
              setQrTimedOut(false);
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 3000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [companyId, status, qrTimedOut]);

  const handleAbort = async () => {
    setStatus('desconectado');
    setQrCode(null);
    setQrTimedOut(false);
    pollCountRef.current = 0;
    try {
      await fetch('/api/wa/disconnect', { method: 'POST' });
    } catch (err) {
      console.error('Error abortando conexión:', err);
    }
  };

  const handleStartSession = async () => {
    setLoading(true);
    setQrTimedOut(false);
    pollCountRef.current = 0;
    try {
      const res = await fetch('/api/wa/instance', { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al iniciar instancia');
      }
      const data = await res.json();
      setStatus(data.status || 'generando_qr');
      if (data.qr) {
        setQrCode(data.qr);
        setStatus('esperando_qr');
      }
      toast.success('Inicializando servicio de WhatsApp...');
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar con el servidor.');
      setStatus('desconectado');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Estás seguro de que quieres desvincular este WhatsApp? Se detendrá el envío de campañas.')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/wa/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Error al desvincular');
      
      setStatus('desconectado');
      setQrCode(null);
      setQrTimedOut(false);
      toast.success('WhatsApp desvinculado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al desconectar');
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
            <AlertCircle className="w-4 h-4 text-red-600" />
            Envíos Pausados por Errores
          </h4>
          <p className="m-0 text-[0.8rem] text-red-800 dark:text-red-200/80 leading-relaxed">
            Tu conexión de WhatsApp presentó errores de comunicación. Por favor, <strong>vuelve a vincular tu WhatsApp</strong> para reanudar los envíos.
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

      {/* Modal QR Overlay */}
      {(status === 'conectando' || status === 'esperando_qr' || status === 'generando_qr' || status === 'provisionando') && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
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
            
            <div className="p-8 flex flex-col items-center justify-center min-h-[320px]">
              {qrTimedOut ? (
                <div className="flex flex-col items-center text-center p-4">
                  <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    El QR está tardando más de lo esperado
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs">
                    El servidor de WhatsApp no ha retornado la imagen a tiempo. Puedes volver a intentarlo.
                  </p>
                  <Button onClick={handleStartSession} className="bg-primary text-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar generación
                  </Button>
                </div>
              ) : qrCode ? (
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
                  <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {status === 'generando_qr' ? 'Generando código QR...' : 'Preparando servicio...'}
                  </span>
                  <span className="text-xs text-zinc-400 mt-1">Por favor espera un momento</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
