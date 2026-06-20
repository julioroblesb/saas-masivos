'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { QrCode, Smartphone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface WhatsappConnectionProps {
  companyId?: string | null;
}

export function WhatsappConnection({ companyId }: WhatsappConnectionProps) {
  const [status, setStatus] = useState<string>('cargando');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!companyId) return;

    // 1. Obtener estado inicial
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
    };

    fetchStatus();

    // 2. Suscribirse a los canales de Broadcast para el QR
    const channel = supabase.channel(`wa_qr_${companyId}`);
    
    channel.on('broadcast', { event: 'qr_update' }, (payload) => {
      console.log('Recibido QR:', payload);
      setQrCode(payload.payload.qr);
      setStatus('conectando'); // Asumimos que si hay QR, estamos intentando conectar
    }).subscribe();

    // 3. Polling inteligente: SOLO revisar el estado si estamos conectando o esperando QR
    // Necesitamos consultar a BuilderBot Cloud para obtener el QR y el status real
    let interval: NodeJS.Timeout;
    if (status === 'conectando' || status === 'esperando_qr') {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/wa/status');
          if (res.ok) {
            const data = await res.json();
            if (data.status && data.status !== status) {
              setStatus(data.status);
              if (data.status === 'conectado') {
                setQrCode(null);
                toast.success('¡WhatsApp conectado exitosamente!');
              }
            }
            if (data.qr && data.qr !== qrCode) {
              setQrCode(data.qr);
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 5000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [companyId, status, supabase]);

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
        <button 
          type="button"
          onClick={handleDisconnect} 
          disabled={loading}
          className="btn btn-outline-danger btn-sm"
        >
          {loading ? 'Desvinculando...' : 'Desvincular'}
        </button>
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
          <Button onClick={handleStartSession} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white w-fit">
            <Smartphone className="w-4 h-4 mr-2" />
            {loading ? 'Iniciando...' : 'Vincular WhatsApp'}
          </Button>
        ) : null}
      </div>

      {/* QR Modal Overlay */}
      {(status === 'conectando' || status === 'esperando_qr') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0e1726] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-green-600" />
                Vincular Dispositivo
              </h3>
              <button 
                onClick={() => setStatus('desconectado')}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <AlertCircle className="w-5 h-5" />
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
