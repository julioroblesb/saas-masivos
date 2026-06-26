import React, { useState } from 'react';
import { X, Clock, User, Phone, Sparkles, Banknote, Calendar as CalendarIcon, Tag, Mail, CalendarDays, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface VisitDetailsModalProps {
  visit: any;
  staffList: any[];
  onClose: () => void;
}

export function VisitDetailsModal({ visit, staffList, onClose }: VisitDetailsModalProps) {
  const [expanded, setExpanded] = useState(false);

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
      <div className={`bg-white dark:bg-dark-light rounded-2xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-300 transition-all ${expanded ? 'max-h-[90vh]' : 'max-h-[85vh]'}`}>
        
        {/* Header */}
        <div className="relative h-24 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black rounded-full backdrop-blur-md transition-colors z-10"
          >
            <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 bg-white dark:bg-dark border-4 border-white dark:border-dark-light rounded-2xl shadow-md flex items-center justify-center text-primary relative overflow-hidden group">
              <User className="w-8 h-8 relative z-10 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-primary/10 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pb-4">
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
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                  <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" /> Fecha y Hora
                </div>
                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {format(new Date(visit.visit_date), "d MMM yyyy", { locale: es })}
                  <br/>
                  <span className="text-primary font-bold">{format(new Date(visit.visit_date), "HH:mm")}</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" /> Especialista
                </div>
                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {staff?.name || 'Sin asignar'}
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div className="flex items-start gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors">
                <Tag className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Servicio</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{service?.name || 'Servicio General'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors">
                <Banknote className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pago</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 capitalize flex items-center gap-2">
                    {visit.payment_status}
                    {visit.price_charged ? (
                      <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded font-bold text-sm border border-emerald-500/20">
                        S/ {visit.price_charged}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>

            {/* Expanded Profile Section */}
            {expanded && (
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Expediente del Cliente
                </h3>
                
                <div className="space-y-4">
                  {contact?.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-500 font-medium">Correo Electrónico</p>
                        <p className="text-sm font-medium">{contact.email}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 font-medium">Cliente desde</p>
                      <p className="text-sm font-medium">
                        {contact?.created_at ? format(new Date(contact.created_at), "d 'de' MMMM, yyyy", { locale: es }) : 'Información no disponible'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-primary">Estado de CRM</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-600 dark:text-zinc-400">Canal de origen:</span>
                      <span className="font-medium capitalize">{contact?.source || 'Orgánico'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-dark-light/50 shrink-0">
           <button 
             onClick={() => setExpanded(!expanded)}
             className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors shadow-sm"
           >
             {expanded ? 'Ocultar Detalles' : 'Ver Perfil Completo del Cliente'}
           </button>
        </div>

      </div>
    </div>
  );
}
