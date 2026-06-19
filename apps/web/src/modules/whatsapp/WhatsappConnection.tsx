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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDisconnect} 
          disabled={loading}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          {loading ? 'Desvinculando...' : 'Desvincular'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {status === 'desconectado' || status === 'error' ? (
        <Button onClick={handleStartSession} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
          <Smartphone className="w-4 h-4 mr-2" />
          {loading ? 'Iniciando...' : 'Vincular WhatsApp'}
        </Button>
      ) : null}

      {(status === 'conectando' || status === 'esperando_qr') && (
        <div className="flex items-center space-x-3 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
          {qrCode ? (
            <div className="flex items-center space-x-4">
              <div className="bg-white p-1 rounded-md border border-zinc-200 shadow-sm">
                <Image src={qrCode} alt="WhatsApp QR Code" width={80} height={80} className="rounded-sm" />
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <p className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Escanea el código QR</p>
                <p>1. Abre WhatsApp en tu celular</p>
                <p>2. Toca Menú o Configuración y selecciona Dispositivos Vinculados</p>
                <p>3. Toca Vincular un Dispositivo</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-4 py-2 text-zinc-600 dark:text-zinc-400">
              <QrCode className="w-5 h-5 animate-pulse" />
              <span className="text-sm">Generando código QR...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
