'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, User, Clock, AlertCircle } from 'lucide-react';
import { format, parse, addMinutes, isBefore, isAfter, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStaffAvailabilityAction, createVisitAction } from './actions';
import { CustomSelect } from '@/components/ui/CustomSelect';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface NewBookingModalProps {
  contacts: any[];
  services: any[];
  staffList: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function NewBookingModal({ contacts, services, staffList, onClose, onSuccess }: NewBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contact_id: '',
    service_id: '',
    staff_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: ''
  });

  const [availability, setAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', document_number: '' });

  // Filter staff by selected service
  const availableStaff = useMemo(() => {
    if (!form.service_id) return [];
    return staffList.filter(s => s.isActive && (s.services || []).includes(form.service_id));
  }, [form.service_id, staffList]);

  // Fetch availability when staff and date change
  useEffect(() => {
    if (form.staff_id && form.date) {
      fetchAvailability();
    } else {
      setAvailability(null);
      setForm(prev => ({ ...prev, time: '' }));
    }
  }, [form.staff_id, form.date]);

  const fetchAvailability = async () => {
    setLoadingAvailability(true);
    setForm(prev => ({ ...prev, time: '' }));
    try {
      const data = await getStaffAvailabilityAction(form.staff_id, form.date);
      if (data.error) {
        console.error(data.error);
        setAvailability(null);
      } else {
        setAvailability(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Generate available slots based on the schedule, blocks, and visits
  const availableSlots = useMemo(() => {
    if (!availability || !availability.schedule || !availability.schedule.is_working) return [];

    const slots: string[] = [];
    const baseDate = parse(form.date, 'yyyy-MM-dd', new Date());
    
    // Parse schedule times
    const schedStart = parse(availability.schedule.start_time, 'HH:mm:ss', baseDate);
    const schedEnd = parse(availability.schedule.end_time, 'HH:mm:ss', baseDate);
    
    // Prepare blocks
    const parsedBlocks = availability.blocks.map((b: any) => ({
      start: parse(b.start_time, 'HH:mm:ss', baseDate),
      end: parse(b.end_time, 'HH:mm:ss', baseDate)
    }));

    // Prepare visits
    const parsedVisits = availability.visits.map((v: any) => {
      const start = new Date(v.visit_date);
      const end = addMinutes(start, v.duration_minutes || 60);
      return { start, end };
    });

    const durationNeeded = 60; // Assuming 60 mins per service for now
    
    let currentSlot = schedStart;
    
    while (isBefore(addMinutes(currentSlot, durationNeeded), schedEnd) || isEqual(addMinutes(currentSlot, durationNeeded), schedEnd)) {
      const slotStart = currentSlot;
      const slotEnd = addMinutes(currentSlot, durationNeeded);
      
      // Check collision with blocks
      const collidesWithBlock = parsedBlocks.some((b: any) => 
        (isBefore(slotStart, b.end) && isAfter(slotEnd, b.start))
      );

      // Check collision with visits
      const collidesWithVisit = parsedVisits.some((v: any) => 
        (isBefore(slotStart, v.end) && isAfter(slotEnd, v.start))
      );

      // Check if slot is in the past if it's today
      let isPast = false;
      if (form.date === format(new Date(), 'yyyy-MM-dd')) {
        if (isBefore(slotStart, new Date())) {
          isPast = true;
        }
      }

      if (!collidesWithBlock && !collidesWithVisit && !isPast) {
        slots.push(format(slotStart, 'HH:mm'));
      }
      
      // increment by 30 mins
      currentSlot = addMinutes(currentSlot, 30);
    }

    return slots;
  }, [availability, form.date]);

  const handleSubmit = async () => {
    if ((!showNewPatient && !form.contact_id) || (showNewPatient && !newPatient.name)) {
      MySwal.fire('Atención', 'Por favor selecciona o ingresa un cliente.', 'warning');
      return;
    }
    if (!form.service_id || !form.staff_id || !form.date || !form.time) {
      MySwal.fire('Atención', 'Por favor completa todos los campos para agendar.', 'warning');
      return;
    }

    setLoading(true);
    
    const visitDate = new Date(`${form.date}T${form.time}:00`);

    const result = await createVisitAction({
      contact_id: !showNewPatient ? form.contact_id : undefined,
      new_contact: showNewPatient ? newPatient : undefined,
      service_id: form.service_id,
      staff_id: form.staff_id,
      visit_date: visitDate.toISOString(),
      duration_minutes: 60 // Default
    });

    setLoading(false);

    if (result.error) {
      MySwal.fire('Error', 'Hubo un error al guardar la cita: ' + result.error, 'error');
    } else {
      MySwal.fire({
        title: '¡Cita Agendada!',
        text: 'La reserva se ha guardado correctamente en la agenda.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-dark-light rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Nueva Cita</h2>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">Programa un servicio para un cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] custom-scrollbar flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold block text-zinc-900 dark:text-white">Cliente *</label>
                  <button 
                    type="button"
                    onClick={() => setShowNewPatient(!showNewPatient)}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {showNewPatient ? 'Seleccionar existente' : '+ Nuevo cliente'}
                  </button>
                </div>
                
                {showNewPatient ? (
                  <div className="grid grid-cols-1 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <input 
                      type="text" 
                      placeholder="Nombre completo *" 
                      className="form-input text-sm rounded-lg border-zinc-300 dark:border-zinc-700 w-full"
                      value={newPatient.name}
                      onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        placeholder="DNI (opcional)" 
                        className="form-input text-sm rounded-lg border-zinc-300 dark:border-zinc-700 w-full"
                        value={newPatient.document_number}
                        onChange={e => setNewPatient(p => ({ ...p, document_number: e.target.value }))}
                      />
                      <input 
                        type="text" 
                        placeholder="Teléfono (opcional)" 
                        className="form-input text-sm rounded-lg border-zinc-300 dark:border-zinc-700 w-full"
                        value={newPatient.phone}
                        onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <CustomSelect
                    options={contacts.map(c => ({
                      value: c.id,
                      label: `${c.name} ${c.document_number ? `- DNI: ${c.document_number}` : ''}`
                    }))}
                    value={form.contact_id ? { 
                      value: form.contact_id, 
                      label: contacts.find(c => c.id === form.contact_id)?.name + 
                             (contacts.find(c => c.id === form.contact_id)?.document_number ? ` - DNI: ${contacts.find(c => c.id === form.contact_id)?.document_number}` : '')
                    } : null}
                    onChange={(opt: any) => setForm({...form, contact_id: opt ? opt.value : ''})}
                    placeholder="Selecciona o busca un cliente..."
                    isSearchable
                    isClearable
                  />
                )}
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-zinc-900 dark:text-white">Servicio *</label>
                <CustomSelect
                  options={services.map(s => ({
                    value: s.id,
                    label: s.name
                  }))}
                  value={form.service_id ? { value: form.service_id, label: services.find(s => s.id === form.service_id)?.name } : null}
                  onChange={(opt: any) => {
                    setForm({...form, service_id: opt ? opt.value : '', staff_id: ''}); // reset staff on service change
                  }}
                  placeholder="Selecciona un servicio..."
                  isSearchable
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-zinc-900 dark:text-white">Especialista *</label>
                <CustomSelect
                  options={availableStaff.map(s => ({
                    value: s.id,
                    label: s.name
                  }))}
                  value={form.staff_id ? { value: form.staff_id, label: availableStaff.find(s => s.id === form.staff_id)?.name } : null}
                  onChange={(opt: any) => setForm({...form, staff_id: opt ? opt.value : ''})}
                  placeholder="Selecciona una especialista..."
                  isDisabled={!form.service_id}
                  isSearchable
                />
                {form.service_id && availableStaff.length === 0 && (
                  <p className="text-xs text-danger mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> No hay especialistas activos para este servicio.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 bg-zinc-50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="text-sm font-semibold mb-2 block text-zinc-900 dark:text-white">Fecha *</label>
                <input 
                  type="date" 
                  className="w-full form-input rounded-xl border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-primary focus:border-primary"
                  value={form.date}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-zinc-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" /> Horarios Disponibles *
                </label>
                
                <div className="min-h-[150px]">
                  {!form.staff_id ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center text-sm py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                      <User className="w-6 h-6 mb-2 opacity-50" />
                      Selecciona especialista y fecha <br/> para ver los horarios
                    </div>
                  ) : loadingAvailability ? (
                    <div className="h-full flex items-center justify-center text-sm text-zinc-500 py-8">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                      Buscando huecos...
                    </div>
                  ) : availability && (!availability.schedule || !availability.schedule.is_working) ? (
                    <div className="h-full flex items-center justify-center text-sm text-danger bg-danger/10 p-4 rounded-xl font-medium text-center">
                      La especialista no trabaja en este día de la semana.
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-amber-600 bg-amber-500/10 p-4 rounded-xl font-medium text-center">
                      No hay horarios disponibles para esta fecha. Intenta otro día.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setForm({...form, time})}
                          className={`py-2 px-1 text-sm font-medium rounded-xl border transition-all ${
                            form.time === time 
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105' 
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-primary/50 hover:text-primary'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end gap-3 shrink-0">
           <button 
             className="px-6 py-2.5 rounded-xl font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
             onClick={onClose}
             disabled={loading}
           >
             Cancelar
           </button>
           <button 
             className="px-8 py-2.5 rounded-xl font-medium text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
             onClick={handleSubmit}
             disabled={loading || !form.time}
           >
             {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
             Confirmar Cita
           </button>
        </div>

      </div>
    </div>
  );
}
