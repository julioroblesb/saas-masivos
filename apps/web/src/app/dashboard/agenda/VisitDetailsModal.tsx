import React from 'react';
import { X, Clock, User, Phone, Stethoscope, Banknote, Calendar as CalendarIcon, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VisitDetailsModalProps {
  visit: any;
  staffList: any[];
  onClose: () => void;
}

export function VisitDetailsModal({ visit, staffList, onClose }: VisitDetailsModalProps) {
  if (!visit) return null;

  const contact = visit.crm_marketing_contacts;
  const service = visit.spa_services;
  const staff = staffList.find(s => s.id === visit.staff_id);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'agendado': return 'bg-blue-500 text-white';
      case 'en_curso': return 'bg-amber-500 text-white';
      case 'completado': return 'bg-emerald-500 text-white';
      case 'cancelado': return 'bg-red-500 text-white';
      case 'no_asistio': return 'bg-zinc-500 text-white';
      default: return 'bg-zinc-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
      <div className="bg-white dark:bg-dark-light rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative h-24 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black rounded-full backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 bg-white dark:bg-dark border-4 border-white dark:border-dark-light rounded-2xl shadow-md flex items-center justify-center text-primary">
              <User className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="pt-12 p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {contact?.name || 'Cliente sin nombre'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(visit.status)}`}>
                {visit.status.replace('_', ' ')}
              </span>
            </div>
            {contact?.phone && (
              <p className="text-sm font-medium text-zinc-500 flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> {contact.phone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                <CalendarIcon className="w-3.5 h-3.5" /> Fecha y Hora
              </div>
              <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {format(new Date(visit.visit_date), "d MMM yyyy", { locale: es })}
                <br/>
                {format(new Date(visit.visit_date), "HH:mm")}
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                <Stethoscope className="w-3.5 h-3.5" /> Especialista
              </div>
              <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {staff?.name || 'Sin asignar'}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <div className="flex items-start gap-3">
              <Tag className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Servicio</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{service?.name || 'Servicio General'}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Banknote className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pago</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                  {visit.payment_status}
                  {visit.price_charged ? ` - $${visit.price_charged}` : ''}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-dark-light/50">
           <button 
             className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
           >
             Ver Perfil Completo del Cliente
           </button>
        </div>

      </div>
    </div>
  );
}
