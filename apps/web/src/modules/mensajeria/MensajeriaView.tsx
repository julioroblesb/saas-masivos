'use client';

import { useState } from 'react';
import { formatBusinessDateTime } from '@/lib/business-date';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit,
  Phone,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Tables } from '@/types/database.generated';

type QueueMessage = Pick<
  Tables<'crm_wa_queue'>,
  'created_at' | 'id' | 'message' | 'phone' | 'scheduled_for' | 'status'
> & {
  crm_marketing_contacts?: Array<{ name: string | null }> | null;
};

function MessagePreview({
  message,
  expanded,
  onToggle,
}: {
  message: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const canExpand = message.length > 110 || message.includes('\n');

  return (
    <div>
      <p className={`whitespace-pre-wrap text-sm leading-5 text-zinc-600 dark:text-zinc-300 ${expanded ? '' : 'line-clamp-2'}`}>
        {message}
      </p>
      {canExpand && (
        <button
          type="button"
          className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded ? 'Ver menos' : 'Ver mensaje completo'}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
}

export default function MensajeriaView() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
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
          crm_marketing_contacts!crm_queue_contact_tenant_fkey (name)
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

  const closeEditor = () => {
    if (isSaving) return;
    setEditingId(null);
    setEditContent('');
    setEditDate('');
  };

  const handleEditClick = (msg: QueueMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.message);
    setEditDate(msg.scheduled_for || msg.created_at);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim() || !editDate) return;
    setIsSaving(true);
    try {
      const scheduledFor = new Date(editDate).toISOString();
      const { error } = await supabase
        .from('crm_wa_queue')
        .update({
          message: editContent.trim(),
          scheduled_for: scheduledFor,
          next_attempt_at: scheduledFor,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Mensaje actualizado exitosamente');
      await messagesQuery.refetch();
      setEditingId(null);
      setEditContent('');
      setEditDate('');
    } catch (err: unknown) {
      console.error('Error updating message:', err);
      toast.error('Error al actualizar el mensaje');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas cancelar este mensaje?')) return;
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
      toast.error('Error al cancelar el mensaje');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <span className="badge flex w-max items-center gap-1 bg-warning/10 text-warning"><Clock size={12} /> Pendiente</span>;
      case 'leased':
      case 'processing':
        return <span className="badge flex w-max items-center gap-1 bg-info/10 text-info"><Send size={12} /> Enviando</span>;
      case 'sent':
        return <span className="badge flex w-max items-center gap-1 bg-success/10 text-success"><CheckCircle size={12} /> Enviado</span>;
      case 'retry_scheduled':
        return <span className="badge flex w-max items-center gap-1 bg-warning/10 text-warning"><Clock size={12} /> Reintentando</span>;
      case 'failed':
      case 'dead_letter':
        return <span className="badge flex w-max items-center gap-1 bg-danger/10 text-danger"><AlertTriangle size={12} /> Fallido</span>;
      case 'cancelled':
        return <span className="badge w-max bg-zinc-100 text-zinc-500">Cancelado</span>;
      default:
        return <span className="badge w-max bg-zinc-100 text-zinc-500">{status}</span>;
    }
  };

  const renderActions = (msg: QueueMessage) => {
    if (!['queued', 'retry_scheduled'].includes(msg.status)) return null;

    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 text-primary transition-[background-color,border-color,transform] duration-200 active:scale-[0.97] hover:bg-primary/5"
          onClick={() => handleEditClick(msg)}
          aria-label="Editar mensaje"
        >
          <Edit size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-danger/30 text-danger transition-[background-color,border-color,transform] duration-200 active:scale-[0.97] hover:bg-danger/5"
          onClick={() => handleDelete(msg.id)}
          aria-label="Cancelar mensaje"
        >
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </div>
    );
  };

  if (messagesQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16" aria-label="Cargando mensajes">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (messagesQuery.isError) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-5" role="alert">
        <p className="text-danger">{messagesQuery.error.message}</p>
        <button type="button" className="btn btn-outline-danger mt-4 min-h-11" onClick={() => messagesQuery.refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-black-light bg-white dark:border-dark-light dark:bg-dark" aria-labelledby="messages-title">
        <header className="flex items-center justify-between gap-4 border-b border-black-light/50 p-4 dark:border-dark-light sm:p-5">
          <div>
            <h2 id="messages-title" className="text-lg font-semibold text-dark dark:text-white-light">
              Mensajes programados
            </h2>
            <p className="mt-1 text-sm text-muted">Consulta el estado, contenido y hora de cada envío.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary min-h-11 shrink-0"
            onClick={() => messagesQuery.refetch()}
            disabled={messagesQuery.isFetching}
          >
            {messagesQuery.isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
        </header>

        {messages.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">No hay mensajes en cola.</div>
        ) : (
          <>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 md:hidden">
              {messages.map((msg) => (
                <article key={msg.id} className="p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-black dark:text-white">
                      <Calendar size={15} className="shrink-0 text-zinc-400" aria-hidden="true" />
                      <time>{formatBusinessDateTime(msg.scheduled_for || msg.created_at)}</time>
                    </div>
                    {getStatusBadge(msg.status)}
                  </div>

                  <div className="mb-3">
                    <p className="font-semibold text-black dark:text-white">
                      {msg.crm_marketing_contacts?.[0]?.name || 'Desconocido'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <Phone size={12} aria-hidden="true" /> {msg.phone}
                    </p>
                  </div>

                  <MessagePreview
                    message={msg.message}
                    expanded={expandedIds.has(msg.id)}
                    onToggle={() => toggleExpanded(msg.id)}
                  />

                  {['queued', 'retry_scheduled'].includes(msg.status) && (
                    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      {renderActions(msg)}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <table className="w-full table-fixed text-left">
                <thead className="bg-zinc-50 text-sm font-semibold text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
                  <tr>
                    <th className="w-[190px] p-4">Fecha programada</th>
                    <th className="w-[190px] p-4">Destinatario</th>
                    <th className="p-4">Mensaje</th>
                    <th className="w-[130px] p-4">Estado</th>
                    <th className="w-[120px] p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {messages.map((msg) => (
                    <tr key={msg.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2 text-sm font-medium text-black dark:text-white">
                          <Calendar size={14} className="shrink-0 text-zinc-400" aria-hidden="true" />
                          {formatBusinessDateTime(msg.scheduled_for || msg.created_at)}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="truncate font-semibold text-black dark:text-white">
                          {msg.crm_marketing_contacts?.[0]?.name || 'Desconocido'}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <Phone size={11} aria-hidden="true" /> {msg.phone}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <MessagePreview
                          message={msg.message}
                          expanded={expandedIds.has(msg.id)}
                          onToggle={() => toggleExpanded(msg.id)}
                        />
                      </td>
                      <td className="p-4 align-top">{getStatusBadge(msg.status)}</td>
                      <td className="p-4 align-top">{renderActions(msg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <Dialog
        open={Boolean(editingId)}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar mensaje programado</DialogTitle>
            <DialogDescription>
              Ajusta el contenido o la fecha antes de que el mensaje entre en procesamiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Fecha y hora
              </label>
              <CustomDatePicker
                enableTime
                value={editDate}
                onChangeDate={(dateStr) => setEditDate(dateStr)}
              />
            </div>
            <div>
              <label htmlFor="edit-message" className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Mensaje
              </label>
              <textarea
                id="edit-message"
                className="min-h-36 w-full resize-y rounded-xl border border-slate-200 bg-transparent px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-800 dark:text-white"
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <button type="button" className="btn btn-outline-secondary min-h-11" onClick={closeEditor} disabled={isSaving}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary min-h-11"
              onClick={handleSaveEdit}
              disabled={isSaving || !editContent.trim() || !editDate}
            >
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
