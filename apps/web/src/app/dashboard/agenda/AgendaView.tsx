'use client';

import React, { useState, useMemo } from 'react';
import { SpaVisit, SpaService } from '@/types/spa';
import { SpaStaff, CRMMarketingContact } from '@/types/crm';
import { 
  Calendar as CalendarIcon, 
  Kanban, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User,
  Plus,
  Search
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  isSameDay, 
  isToday,
  isWithinInterval
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DayVisitsModal } from './DayVisitsModal';
import { VisitDetailsModal } from './VisitDetailsModal';
import { NewBookingModal } from './NewBookingModal';

interface AgendaViewProps {
  initialVisits: any[];
  services: SpaService[];
  contacts: any[];
  staffList: any[];
}

export function AgendaView({ initialVisits, services, contacts, staffList }: AgendaViewProps) {
  const [view, setView] = useState<'calendar' | 'kanban'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  // Kanban specific state
  const [kanbanFilter, setKanbanFilter] = useState<'day' | 'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  // Derive data
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Render Helpers
  const getVisitsForDay = (day: Date) => {
    return initialVisits.filter(visit => {
      if (!visit.visit_date) return false;
      const visitDate = new Date(visit.visit_date);
      return isSameDay(visitDate, day);
    });
  };

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

  // Filter kanban visits based on current kanbanFilter, currentDate AND search query
  const kanbanVisits = useMemo(() => {
    return initialVisits.filter(visit => {
      if (!visit.visit_date) return false;
      const visitDate = new Date(visit.visit_date);
      
      let dateMatch = false;
      if (kanbanFilter === 'day') {
        dateMatch = isSameDay(visitDate, currentDate);
      } else if (kanbanFilter === 'week') {
        const wStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const wEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        dateMatch = isWithinInterval(visitDate, { start: wStart, end: wEnd });
      } else {
        dateMatch = isSameMonth(visitDate, currentDate);
      }

      if (!dateMatch) return false;

      // Filter by search query (client name or staff name)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const contactName = (visit.crm_marketing_contacts?.name || '').toLowerCase();
        const staffName = (staffList.find(s => s.id === visit.staff_id)?.name || '').toLowerCase();
        if (!contactName.includes(query) && !staffName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [initialVisits, currentDate, kanbanFilter, searchQuery, staffList]);

  return (
    <div className="flex flex-col h-full min-h-[70vh] bg-white dark:bg-dark-light rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
      
      {/* Header controls */}
      <div className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
        
        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white capitalize w-48 shrink-0">
              {format(currentDate, dateFormat, { locale: es })}
            </h2>
            <div className="flex items-center bg-white dark:bg-dark border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm p-1">
              <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goToToday} className="px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-700 dark:text-zinc-300">
                Hoy
              </button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Kanban Search and Filter */}
          {view === 'kanban' && (
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto animate-in fade-in slide-in-from-left-4">
              <div className="relative flex-1 sm:w-64 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Buscar cliente o especialista..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl shadow-inner shrink-0">
                <button 
                  onClick={() => setKanbanFilter('day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kanbanFilter === 'day' ? 'bg-white dark:bg-dark text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Día
                </button>
                <button 
                  onClick={() => setKanbanFilter('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kanbanFilter === 'week' ? 'bg-white dark:bg-dark text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Semana
                </button>
                <button 
                  onClick={() => setKanbanFilter('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${kanbanFilter === 'month' ? 'bg-white dark:bg-dark text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Mes
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions & View Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl shadow-inner w-full sm:w-auto">
            <button 
              onClick={() => setView('calendar')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'calendar' ? 'bg-white dark:bg-dark text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Mes</span>
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'kanban' ? 'bg-white dark:bg-dark text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium shadow-md shadow-primary/20 hover:bg-primary/90 transition-all shrink-0"
            onClick={() => setIsBookingModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-zinc-50/30 dark:bg-dark/20 p-4 sm:p-6 overflow-hidden flex flex-col min-h-[500px]">
        {view === 'calendar' ? (
          <div className="flex flex-col h-full bg-white dark:bg-dark rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                <div key={day} className="py-3 px-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {days.map((day, dayIdx) => {
                const dayVisits = getVisitsForDay(day);
                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[120px] p-2 border-r border-b border-zinc-100 dark:border-zinc-800/60 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20 group cursor-pointer
                      ${!isSameMonth(day, monthStart) ? 'bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-400' : 'bg-white dark:bg-dark text-zinc-900 dark:text-zinc-100'}
                      ${isToday(day) ? 'bg-primary/5 dark:bg-primary/5' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${isToday(day) ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors'}`}>
                        {format(day, 'd')}
                      </span>
                      {dayVisits.length > 0 && (
                        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                          {dayVisits.length} citas
                        </span>
                      )}
                    </div>
                    
                    {/* Visits List for Day */}
                    <div className="space-y-1.5 h-[calc(100%-40px)] overflow-y-auto pr-1 custom-scrollbar relative">
                      {dayVisits.slice(0, 3).map(visit => {
                        const contact = visit.crm_marketing_contacts;
                        const service = visit.spa_services;
                        const staff = staffList.find(s => s.id === visit.staff_id);
                        
                        return (
                          <div 
                            key={visit.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedVisit(visit); }}
                            className={`px-2 py-1.5 rounded border text-xs flex flex-col gap-1 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer ${getStatusColor(visit.status)}`}
                          >
                            <div className="font-semibold truncate leading-tight">{contact?.name || 'Cliente'}</div>
                            
                            <div className="flex items-center justify-between gap-1 mt-0.5 border-t border-current/10 pt-1">
                               <div className="flex items-center gap-1 opacity-90 text-[10px] truncate">
                                 <User className="w-3 h-3 shrink-0" />
                                 <span className="truncate">{staff?.name || 'Sin asignar'}</span>
                               </div>
                               <div className="flex items-center gap-1 opacity-90 text-[10px] shrink-0 font-medium">
                                 <Clock className="w-3 h-3 shrink-0" />
                                 {format(new Date(visit.visit_date), 'HH:mm')}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                      {dayVisits.length > 3 && (
                        <div className="text-[10px] font-semibold text-zinc-500 text-center pt-1 pb-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                          + {dayVisits.length - 3} citas más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-6 h-full min-w-max">
               {['agendado', 'en_curso', 'completado'].map(colStatus => {
                 const colVisits = kanbanVisits.filter(v => v.status === colStatus);
                 const bgHeader = colStatus === 'agendado' ? 'bg-blue-500' : colStatus === 'en_curso' ? 'bg-amber-500' : 'bg-emerald-500';
                 
                 return (
                   <div key={colStatus} className="w-[340px] flex flex-col bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200 dark:border-zinc-800 max-h-full">
                      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-t-2xl">
                        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 capitalize">
                          <div className={`w-2.5 h-2.5 rounded-full ${bgHeader} shadow-sm`}></div>
                          {colStatus.replace('_', ' ')}
                        </h3>
                        <span className="bg-white dark:bg-zinc-800 text-xs font-bold px-2 py-1 rounded-full text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                          {colVisits.length}
                        </span>
                      </div>
                      
                      <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                        {colVisits.map(visit => {
                           const contact = visit.crm_marketing_contacts;
                           const service = visit.spa_services;
                           const staff = staffList.find(s => s.id === visit.staff_id);
                           
                           return (
                             <div 
                               key={visit.id} 
                               onClick={() => setSelectedVisit(visit)}
                               className="bg-white dark:bg-dark p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300"
                             >
                               <div className="flex items-start justify-between mb-2">
                                 <div className="font-semibold text-sm group-hover:text-primary transition-colors pr-2 truncate">
                                   {contact?.name || 'Cliente'}
                                 </div>
                                 {visit.price_charged ? (
                                   <div className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                     S/ {visit.price_charged}
                                   </div>
                                 ) : null}
                               </div>
                               
                               <div className="text-xs text-zinc-500 mb-3 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/60 line-clamp-2">
                                 {service?.name || 'Servicio General'}
                               </div>
                               
                               <div className="flex items-center justify-between pt-2">
                                 <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                   <Clock className="w-3.5 h-3.5 text-zinc-400" /> 
                                   {format(new Date(visit.visit_date), 'dd MMM, HH:mm', { locale: es })}
                                 </div>
                                 <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                                   <User className="w-3.5 h-3.5 text-zinc-400" />
                                   <span className="truncate max-w-[80px]">{staff?.name || 'Sin asignar'}</span>
                                 </div>
                               </div>
                             </div>
                           )
                        })}
                        {colVisits.length === 0 && (
                          <div className="text-center py-10 flex flex-col items-center justify-center text-zinc-400">
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                              <Kanban className="w-5 h-5 opacity-50" />
                            </div>
                            <p className="text-sm font-medium">No hay citas</p>
                            {searchQuery && <p className="text-xs opacity-70 mt-1">con esta búsqueda</p>}
                          </div>
                        )}
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>
        )}
      </div>

      {selectedDay && (
        <DayVisitsModal 
          date={selectedDay}
          visits={getVisitsForDay(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onVisitClick={(visit) => {
             setSelectedDay(null);
             setSelectedVisit(visit);
          }}
        />
      )}

      {selectedVisit && (
        <VisitDetailsModal 
          visit={selectedVisit}
          staffList={staffList}
          onClose={() => setSelectedVisit(null)}
        />
      )}

      {isBookingModalOpen && (
        <NewBookingModal 
          contacts={contacts}
          services={services}
          staffList={staffList}
          onClose={() => setIsBookingModalOpen(false)}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            // In a real app we might refetch data here, but Server Actions with revalidatePath 
            // should trigger a router refresh. Wait a tiny bit just in case.
            window.location.reload(); 
          }}
        />
      )}
    </div>
  );
}
