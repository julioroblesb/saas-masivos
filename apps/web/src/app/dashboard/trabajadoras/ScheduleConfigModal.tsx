'use client';

import React, { useState, useEffect } from 'react';
import { SpaStaffSchedule } from '@/types/spa';
import { getStaffSchedulesAction, upsertStaffSchedulesAction } from './actions';
import { X, Save, Clock, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ScheduleConfigModalProps {
  staffId: string;
  staffName: string;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 0, label: 'Domingo' }
];

export function ScheduleConfigModal({ staffId, staffName, onClose }: ScheduleConfigModalProps) {
  const [schedules, setSchedules] = useState<SpaStaffSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getStaffSchedulesAction(staffId);
      if (data && data.length > 0) {
        setSchedules(data);
      } else {
        // Default schedules: Lunes a Viernes 09:00 a 18:00
        const defaultSchedules = DAYS_OF_WEEK.map(day => ({
          id: '',
          company_id: '',
          staff_id: staffId,
          day_of_week: day.id,
          start_time: '09:00:00',
          end_time: '18:00:00',
          is_working: day.id >= 1 && day.id <= 5
        }));
        setSchedules(defaultSchedules);
      }
      setLoading(false);
    }
    load();
  }, [staffId]);

  const updateSchedule = (dayId: number, field: keyof SpaStaffSchedule, value: any) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayId ? { ...s, [field]: value } : s
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await upsertStaffSchedulesAction(staffId, schedules);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Horario guardado correctamente');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-light rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-dark-light/50">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Horario de Disponibilidad
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Configurando horario para: <span className="font-medium text-zinc-700 dark:text-zinc-300">{staffName}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <div className="col-span-4">Día</div>
                <div className="col-span-8 grid grid-cols-2 gap-4">
                  <div>Hora Inicio</div>
                  <div>Hora Fin</div>
                </div>
              </div>

              {DAYS_OF_WEEK.map(day => {
                const schedule = schedules.find(s => s.day_of_week === day.id);
                if (!schedule) return null;

                return (
                  <div 
                    key={day.id} 
                    className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all duration-200 ${
                      schedule.is_working 
                        ? 'bg-white dark:bg-dark border-zinc-200 dark:border-zinc-800 shadow-sm' 
                        : 'bg-zinc-50 dark:bg-zinc-900/50 border-transparent opacity-60'
                    }`}
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={schedule.is_working}
                          onChange={(e) => updateSchedule(day.id, 'is_working', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-primary"></div>
                      </label>
                      <span className={`font-medium ${schedule.is_working ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>
                        {day.label}
                      </span>
                    </div>

                    <div className="col-span-8 grid grid-cols-2 gap-4">
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                          type="time" 
                          disabled={!schedule.is_working}
                          value={schedule.start_time.substring(0, 5)}
                          onChange={(e) => updateSchedule(day.id, 'start_time', e.target.value + ':00')}
                          className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-dark rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all"
                        />
                      </div>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                          type="time" 
                          disabled={!schedule.is_working}
                          value={schedule.end_time.substring(0, 5)}
                          onChange={(e) => updateSchedule(day.id, 'end_time', e.target.value + ':00')}
                          className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-dark rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-dark-light/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar Horario
          </button>
        </div>
      </div>
    </div>
  );
}
