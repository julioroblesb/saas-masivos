'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import {
  Calendar,
  Clock,
  Phone,
  Send,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import type { Tables } from '@/types/database.generated';

type QueueMessage = Pick<
  Tables<'crm_wa_queue'>,
  'created_at' | 'id' | 'message' | 'phone' | 'scheduled_for' | 'status'
> & {
  crm_marketing_contacts?: Array<{ name: string | null }> | null;
};

export default function MensajeriaView() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const messagesQuery = useQuery<QueueMessage[]>({
    queryKey: ['scheduled-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_wa_queue')
        .select(
          `
          id, 
          phone, 
          message, 
          status, 
          scheduled_for, 
          created_at,
          crm_marketing_contacts (name)
        `,
        )
        .order('scheduled_for', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
  const messages = messagesQuery.data || [];

  const handleEditClick = (msg: QueueMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.message);
    setEditDate(msg.scheduled_for || msg.created_at);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('crm_wa_queue')
        .update({
          message: editContent,
          scheduled_for: new Date(editDate).toISOString(),
          next_attempt_at: new Date(editDate).toISOString(),
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Mensaje actualizado exitosamente');
      await messagesQuery.refetch();
      setEditingId(null);
    } catch (err: unknown) {
      console.error('Error updating message:', err);
      toast.error('Error al actualizar el mensaje');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este mensaje?')) return;
    try {
      const { error } = await supabase
        .from('crm_wa_queue')
        .update({
          status: 'cancelled',
          last_error_code: 'USER_CANCELLED',
          last_error_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['queued', 'retry_scheduled']);
      if (error) throw error;
      toast.success('Mensaje cancelado');
      await messagesQuery.refetch();
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el mensaje');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return (
          <span className="badge bg-warning/10 text-warning flex items-center gap-1 w-max">
            <Clock size={12} /> Pendiente
          </span>
        );
      case 'leased':
      case 'processing':
        return (
          <span className="badge bg-info/10 text-info flex items-center gap-1 w-max">
            <Send size={12} /> Enviando
          </span>
        );
      case 'sent':
        return (
          <span className="badge bg-success/10 text-success flex items-center gap-1 w-max">
            <CheckCircle size={12} /> Enviado
          </span>
        );
      case 'retry_scheduled':
        return (
          <span className="badge bg-warning/10 text-warning flex items-center gap-1 w-max">
            <Clock size={12} /> Reintentando
          </span>
        );
      case 'failed':
      case 'dead_letter':
        return (
          <span className="badge bg-danger/10 text-danger flex items-center gap-1 w-max">
            <AlertTriangle size={12} /> Fallido
          </span>
        );
      case 'cancelled':
        return <span className="badge bg-zinc-100 text-zinc-500 w-max">Cancelado</span>;
      default:
        return <span className="badge bg-zinc-100 text-zinc-500 w-max">{status}</span>;
    }
  };

  if (messagesQuery.isPending) {
    return (
      <div className="panel flex justify-center items-center p-12">
        <span className="animate-spin border-2 border-primary border-t-transparent w-6 h-6 rounded-full inline-block"></span>
      </div>
    );
  }

  if (messagesQuery.isError) {
    return (
      <div className="panel" role="alert">
        <p className="text-danger">{messagesQuery.error.message}</p>
        <button type="button" className="btn btn-outline-danger mt-4" onClick={() => messagesQuery.refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-0 overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-black-light/50 dark:border-dark-light">
        <h5 className="font-semibold text-lg dark:text-white-light">
          Mensajes Programados y Sistema
        </h5>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => messagesQuery.refetch()}
          disabled={messagesQuery.isFetching}
        >
          {messagesQuery.isFetching ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      <div className="table-responsive">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No hay mensajes en cola.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="p-4 w-[180px]">Fecha Programada</th>
                <th className="p-4 w-[200px]">Destinatario</th>
                <th className="p-4">Mensaje</th>
                <th className="p-4 w-[120px]">Estado</th>
                <th className="p-4 w-[100px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="p-4 align-top">
                    {editingId === msg.id ? (
                      <div className="min-w-[180px]">
                        <CustomDatePicker
                          enableTime={true}
                          value={editDate}
                          onChangeDate={(dateStr) => setEditDate(dateStr)}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-black dark:text-white font-medium">
                        <Calendar size={14} className="text-zinc-400 shrink-0" />
                        {new Date(msg.scheduled_for || msg.created_at).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    <div className="font-semibold text-black dark:text-white">
                      {msg.crm_marketing_contacts?.[0]?.name || 'Desconocido'}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                      <Phone size={10} /> {msg.phone}
                    </div>
                  </td>
                  <td className="p-4 align-top text-zinc-600 dark:text-zinc-300">
                    {editingId === msg.id ? (
                      <textarea
                        className="form-textarea w-full text-sm min-h-[80px]"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={isSaving}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    )}
                  </td>
                  <td className="p-4 align-top">{getStatusBadge(msg.status)}</td>
                  <td className="p-4 align-top text-right">
                    {editingId === msg.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger p-1.5"
                          onClick={() => setEditingId(null)}
                          disabled={isSaving}
                          aria-label="Cancelar edición"
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success p-1.5 text-white"
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          aria-label="Guardar mensaje"
                        >
                          {isSaving ? (
                            <span className="animate-spin border-2 border-white border-t-transparent w-3.5 h-3.5 rounded-full inline-block"></span>
                          ) : (
                            <Save size={14} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {['queued', 'retry_scheduled'].includes(msg.status) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary p-1.5"
                            onClick={() => handleEditClick(msg)}
                            aria-label="Editar mensaje"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {['queued', 'retry_scheduled'].includes(msg.status) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger p-1.5"
                            onClick={() => handleDelete(msg.id)}
                            aria-label="Cancelar mensaje"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
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
