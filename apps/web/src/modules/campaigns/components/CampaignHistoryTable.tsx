import React, { useState } from 'react';
import { format } from 'date-fns';
import type { WaCampaign } from '../../../types/crm';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import Badge from '@/components/legacy/Badge';

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
    <div className="table-responsive">
      <table className="table-hover">
        <thead>
          <tr>
            <th>Nombre y Fecha</th>
            <th>Segmento</th>
            <th className="text-center">Progreso</th>
            <th className="text-center">Éxito</th>
            <th className="text-center">Conversión</th>
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
                  <td className="text-center">
                    <div className="inline-flex items-center gap-3 text-sm">
                      <span className="text-success" title="Enviados">✅ {c.sent}</span>
                      <span className="text-danger" title="Fallidos">❌ {c.failed}</span>
                      <span className="text-white-dark" title="Total">/ {c.total}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`font-bold ${successRate > 80 ? 'text-success' : 'text-warning'}`}>
                      {successRate}%
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`font-bold text-primary`} title={`${c.repliedCount || 0} respuestas`}>
                      {conversionRate}%
                    </span>
                  </td>
                  <td className="text-center">
                    {completed ? (
                      <Badge label="Completada" className="badge-outline-success" icon="heroicons-outline:check-circle" />
                    ) : (
                      <Badge label="Cancelada" className="badge-outline-danger" icon="heroicons-outline:x-circle" />
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
                    <td colSpan={6} className="py-4 px-6 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
                      <div className="pl-4 border-l-2 border-info">
                        <h4 className="text-xs font-semibold text-white-dark uppercase tracking-wider mb-3">Mensajes Enviados ({c.sequence.length})</h4>
                        <div className="space-y-3">
                          {c.sequence.map((msg, idx) => (
                            <div key={msg.id} className="bg-white dark:bg-[#121c2c] rounded-lg p-4 border border-[#e0e6ed] dark:border-[#1b2e4b] shadow-sm max-w-3xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#ebebeb] dark:bg-dark-light text-dark dark:text-white-light text-xs font-bold px-2 py-0.5 rounded">Paso {idx + 1}</span>
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
  );
}
