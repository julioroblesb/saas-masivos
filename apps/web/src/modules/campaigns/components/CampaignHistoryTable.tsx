import React, { useState } from 'react';
import { format } from 'date-fns';
import type { WaCampaign } from '../../../types/crm';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

export function CampaignHistoryTable({ campaigns }: { campaigns: WaCampaign[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-white-dark text-base">No hay campañas en el historial aún.</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <>
      <div className="space-y-3 md:hidden">
        {campaigns.map((campaign) => {
          const successRate = campaign.total > 0 ? Math.round((campaign.sent / campaign.total) * 100) : 0;
          const conversionRate = campaign.sent > 0 ? Math.round(((campaign.repliedCount || 0) / campaign.sent) * 100) : 0;
          const isExpanded = expandedId === campaign.id;

          return (
            <article key={campaign.id} className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-dark dark:text-white-light">{campaign.name}</h3>
                  <p className="mt-1 text-xs text-white-dark">{format(new Date(campaign.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <span className={`badge shrink-0 rounded-full px-2.5 py-1 ${campaign.status === 'completed' ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                  {campaign.status === 'completed' ? 'Completada' : 'Cancelada'}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div><dt className="text-xs text-muted">Enviados</dt><dd className="mt-1 font-bold text-success">{campaign.sent}/{campaign.total}</dd></div>
                <div><dt className="text-xs text-muted">Éxito</dt><dd className="mt-1 font-bold text-dark dark:text-white">{successRate}%</dd></div>
                <div><dt className="text-xs text-muted">Respuesta</dt><dd className="mt-1 font-bold text-primary">{conversionRate}%</dd></div>
              </dl>

              {campaign.sequence && campaign.sequence.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleExpand(campaign.id)}
                    className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 border-t border-black-light/50 pt-3 text-sm font-semibold text-primary transition-colors dark:border-dark-light"
                    aria-expanded={isExpanded}
                  >
                    <MessageSquare size={15} aria-hidden="true" />
                    {isExpanded ? 'Ocultar mensajes' : 'Ver mensajes'}
                    {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                  </button>
                  {isExpanded && (
                    <div className="space-y-3 pt-2">
                      {campaign.sequence.map((message, index) => (
                        <div key={message.id} className="rounded-lg bg-white p-3 text-sm dark:bg-dark">
                          <p className="mb-2 text-xs font-semibold text-muted">Mensaje {index + 1}</p>
                          <p className="whitespace-pre-wrap text-dark dark:text-white-light">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
      <table className="table-hover">
        <thead>
          <tr>
            <th>Nombre y Fecha</th>
            <th>Segmento</th>
            <th className="numeric-column">Progreso</th>
            <th className="numeric-column">Éxito</th>
            <th className="numeric-column">Conversión</th>
            <th className="text-center">Estado</th>
            <th className="text-right">Detalles</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => {
            const successRate = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0;
            const conversionRate = c.sent > 0 ? Math.round(((c.repliedCount || 0) / c.sent) * 100) : 0;
            const completed = c.status === 'completed';
            const isExpanded = expandedId === c.id;
            
            return (
              <React.Fragment key={c.id}>
                <tr>
                  <td>
                    <div className="font-semibold text-dark dark:text-white-light">{c.name}</div>
                    <div className="text-xs text-white-dark mt-1">
                      {format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-outline-info">
                      {c.targetTag || 'Todos'}
                    </span>
                  </td>
                  <td className="numeric-column">
                    <div className="inline-flex items-center gap-3 text-sm">
                      <span className="text-success" title="Enviados">✅ {c.sent}</span>
                      <span className="text-danger" title="Fallidos">❌ {c.failed}</span>
                      <span className="text-white-dark" title="Total">/ {c.total}</span>
                    </div>
                  </td>
                  <td className="numeric-column">
                    <span className={`font-bold ${successRate > 80 ? 'text-success' : 'text-warning'}`}>
                      {successRate}%
                    </span>
                  </td>
                  <td className="numeric-column">
                    <span className={`font-bold text-primary`} title={`${c.repliedCount || 0} respuestas`}>
                      {conversionRate}%
                    </span>
                  </td>
                  <td className="text-center">
                    {completed ? (
                      <span className="badge badge-outline-success rounded-full py-1.5 px-3">Completada</span>
                    ) : (
                      <span className="badge badge-outline-danger rounded-full py-1.5 px-3">Cancelada</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button 
                      onClick={() => toggleExpand(c.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-info hover:text-info/80 transition-colors"
                    >
                      <MessageSquare size={14} />
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                </tr>
                {isExpanded && c.sequence && (
                  <tr className="!bg-secondary-light/30 dark:!bg-secondary-dark-light/30">
                    <td colSpan={6} className="py-4 px-6 border-b border-black-light/50 dark:border-dark-dark-light">
                      <div className="pl-4 border-l-2 border-info">
                        <h4 className="text-xs font-semibold text-white-dark uppercase tracking-wider mb-3">Mensajes Enviados ({c.sequence.length})</h4>
                        <div className="space-y-3">
                          {c.sequence.map((msg, idx) => (
                            <div key={msg.id} className="bg-white dark:bg-dark rounded-lg p-4 border border-black-light/50 dark:border-dark-dark-light shadow-sm max-w-3xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-black-light/20 dark:bg-dark-light text-dark dark:text-white-light text-xs font-bold px-2 py-0.5 rounded">Paso {idx + 1}</span>
                                <span className="text-xs text-white-dark font-medium capitalize">{msg.type}</span>
                                {msg.delayAfterMs > 0 && <span className="text-xs text-white-dark ml-auto">Espera {(msg.delayAfterMs / 1000).toFixed(1)}s después</span>}
                              </div>
                              {msg.mediaUrl && (
                                <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-info hover:underline text-xs block mb-2 break-all">
                                  📎 {msg.mediaUrl}
                                </a>
                              )}
                              <p className="text-sm text-dark dark:text-white-light whitespace-pre-wrap font-sans">
                                {msg.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
