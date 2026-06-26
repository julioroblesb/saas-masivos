import React from 'react';
import { SpaVisit } from '@/types/spa';
import { X, Clock, User, Phone, Mail, Stethoscope } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DayVisitsModalProps {
  date: Date;
  visits: any[];
  onClose: () => void;
  onVisitClick: (visit: any) => void;
}

export function DayVisitsModal({ date, visits, onClose, onVisitClick }: DayVisitsModalProps) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'agendado': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'en_curso': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'completado': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'cancelado': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'no_asistio': return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
      default: return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-dark-light rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-dark-light/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white capitalize">
              {format(date, "EEEE, d 'de' MMMM", { locale: es })}
            </h2>
            <p className="text-sm text-zinc-500">{visits.length} citas programadas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar bg-zinc-50/30 dark:bg-dark/20">
          {visits.length === 0 ? (
            <div className="text-center py-10 text-zinc-500">
              No hay citas para este día.
            </div>
          ) : (
            visits.map(visit => {
              const contact = visit.crm_marketing_contacts;
              const service = visit.spa_services;
              
              return (
                <div 
                  key={visit.id} 
                  onClick={() => onVisitClick(visit)}
                  className={`p-4 rounded-xl border flex gap-4 cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.01] ${getStatusColor(visit.status)}`}
                >
                  <div className="flex flex-col items-center justify-center border-r border-current/10 pr-4 min-w-[70px]">
                    <Clock className="w-4 h-4 mb-1 opacity-70" />
                    <span className="font-bold text-sm">{format(new Date(visit.visit_date), 'HH:mm')}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-base mb-0.5">{contact?.name || 'Cliente sin nombre'}</h4>
                    <p className="text-sm font-medium opacity-90">{service?.name || 'Servicio General'}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                      <span className="uppercase tracking-wider font-semibold">{visit.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
