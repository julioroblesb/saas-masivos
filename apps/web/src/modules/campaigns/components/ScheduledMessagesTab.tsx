'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Clock, Phone, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ScheduledMessagesTab() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_wa_queue')
        .select(`
          id, 
          phone, 
          message, 
          status, 
          scheduled_for, 
          created_at,
          crm_marketing_contacts (name)
        `)
        .order('scheduled_for', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching scheduled messages:', err);
      toast.error('Error al cargar mensajes programados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <span className="badge bg-warning/10 text-warning flex items-center gap-1"><Clock size={12} /> Pendiente</span>;
      case 'enviando':
        return <span className="badge bg-info/10 text-info flex items-center gap-1"><Send size={12} /> Enviando</span>;
      case 'enviado':
        return <span className="badge bg-success/10 text-success flex items-center gap-1"><CheckCircle size={12} /> Enviado</span>;
      case 'fallido':
        return <span className="badge bg-danger/10 text-danger flex items-center gap-1"><AlertTriangle size={12} /> Fallido</span>;
      default:
        return <span className="badge bg-zinc-100 text-zinc-500">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="panel flex justify-center items-center p-12">
        <span className="animate-spin border-2 border-primary border-t-transparent w-6 h-6 rounded-full inline-block"></span>
      </div>
    );
  }

  return (
    <div className="panel p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-white-light dark:border-[#191e3a]">
        <h5 className="font-semibold text-lg dark:text-white-light">Mensajes Programados y Sistema</h5>
        <button className="btn btn-sm btn-outline-primary" onClick={fetchMessages}>
          Actualizar
        </button>
      </div>
      <div className="table-responsive">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No hay mensajes en cola.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="p-4">Fecha Programada</th>
                <th className="p-4">Destinatario</th>
                <th className="p-4">Mensaje</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {messages.map((msg: any) => (
                <tr key={msg.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-black dark:text-white font-medium">
                      <Calendar size={14} className="text-zinc-400" />
                      {new Date(msg.scheduled_for || msg.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-black dark:text-white">
                      {msg.crm_marketing_contacts?.name || 'Desconocido'}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                      <Phone size={10} /> +{msg.phone}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-600 dark:text-zinc-300 max-w-md">
                    <div className="truncate" title={msg.message}>
                      {msg.message}
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(msg.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
