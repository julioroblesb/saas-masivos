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
        <p className="text-slate-500 dark:text-slate-400 text-base">No hay campañas en el historial aún.</p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre y Fecha</th>
            <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Segmento</th>
            <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Progreso</th>
            <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Éxito</th>
            <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Estado</th>
            <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Detalles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {campaigns.map(c => {
            const successRate = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0;
            const completed = c.status === 'completed';
            const isExpanded = expandedId === c.id;
            
            return (
              <React.Fragment key={c.id}>
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {c.targetTag || 'Todos'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-3 text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400" title="Enviados">✅ {c.sent}</span>
                      <span className="text-rose-600 dark:text-rose-400" title="Fallidos">❌ {c.failed}</span>
                      <span className="text-slate-500 dark:text-slate-400" title="Total">/ {c.total}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`font-bold ${successRate > 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                      {successRate}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {completed ? (
                      <Badge label="Completada" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" icon="heroicons-outline:check-circle" />
                    ) : (
                      <Badge label="Cancelada" className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" icon="heroicons-outline:x-circle" />
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => toggleExpand(c.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      <MessageSquare size={14} />
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </td>
                </tr>
                {isExpanded && c.sequence && (
                  <tr className="bg-slate-50/50 dark:bg-slate-900/20">
                    <td colSpan={6} className="py-4 px-6 border-b border-slate-200 dark:border-slate-700">
                      <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Mensajes Enviados ({c.sequence.length})</h4>
                        <div className="space-y-3">
                          {c.sequence.map((msg, idx) => (
                            <div key={msg.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded">Paso {idx + 1}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize">{msg.type}</span>
                                {msg.delayAfterMs > 0 && <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Espera {(msg.delayAfterMs / 1000).toFixed(1)}s después</span>}
                              </div>
                              {msg.mediaUrl && (
                                <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline text-xs block mb-2 break-all">
                                  📎 {msg.mediaUrl}
                                </a>
                              )}
                              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
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
