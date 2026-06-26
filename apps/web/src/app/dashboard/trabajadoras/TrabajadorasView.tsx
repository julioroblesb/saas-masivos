'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserPlus, Calendar } from 'lucide-react';
import { getStaffListAction, upsertStaffAction, deleteStaffAction } from './actions';
import { SpaStaff } from '@/types/crm';
import { supabase } from '@/shared/utils/supabase';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { BirthdayPicker } from '@/components/ui/BirthdayPicker';
import { ScheduleConfigModal } from './ScheduleConfigModal';

const MySwal = withReactContent(Swal);

export default function TrabajadorasView() {
  const [staffList, setStaffList] = useState<SpaStaff[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    birthday: string;
    role: string;
    isActive: boolean;
    services: string[];
  }>({
    name: '',
    birthday: '',
    role: '',
    isActive: true,
    services: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const staff = await getStaffListAction();
      setStaffList(staff);

      const { data: svcData } = await supabase.from('spa_services').select('id, name').eq('is_active', true);
      if (svcData) setServices(svcData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (staff?: SpaStaff) => {
    if (staff) {
      setForm({
        id: staff.id,
        name: staff.name,
        birthday: staff.birthday || '',
        role: staff.role || '',
        isActive: staff.isActive,
        services: staff.services || []
      });
    } else {
      setForm({
        name: '',
        birthday: '',
        role: '',
        isActive: true,
        services: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      MySwal.fire('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    const result = await upsertStaffAction(form);
    if (result.error) {
      MySwal.fire('Error', result.error, 'error');
    } else {
      MySwal.fire('Éxito', 'Trabajadora guardada correctamente', 'success');
      setIsModalOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto. La trabajadora se eliminará.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const del = await deleteStaffAction(id);
      if (del.error) {
        MySwal.fire('Error', del.error, 'error');
      } else {
        MySwal.fire('Eliminada', 'La trabajadora ha sido eliminada.', 'success');
        fetchData();
      }
    }
  };

  const toggleService = (serviceId: string) => {
    setForm(prev => {
      if (prev.services.includes(serviceId)) {
        return { ...prev, services: prev.services.filter(id => id !== serviceId) };
      }
      return { ...prev, services: [...prev.services, serviceId] };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white">Gestión de Equipo</h2>
          <p className="text-zinc-500">Registra a tu equipo y asigna los servicios que realizan.</p>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => handleOpenModal()}
        >
          <UserPlus size={18} />
          Nuevo Miembro
        </button>
      </div>

      <div className="panel p-0 overflow-hidden border border-black-light dark:border-dark-light shadow-sm rounded-3xl">
        <div className="overflow-x-auto -mx-6 px-6">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando trabajadoras...</div>
          ) : staffList.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-500">
              <UserPlus size={48} className="mb-4 opacity-50 text-zinc-500 dark:text-zinc-400" />
              <p className="text-zinc-600 dark:text-zinc-400 font-medium">No hay trabajadoras registradas.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 border-b border-black-light dark:border-dark-light">
                <tr>
                  <th className="py-4 px-4 pl-6">Nombre</th>
                  <th className="py-4 px-4">Especialidad</th>
                  <th className="py-4 px-4">Cumpleaños</th>
                  <th className="py-4 px-4">Servicios Asignados</th>
                  <th className="py-4 px-4">Estado</th>
                  <th className="py-4 px-4 text-center pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black-light dark:divide-dark-light">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-4 px-4 pl-6 font-semibold text-black dark:text-white">{staff.name}</td>
                    <td className="py-4 px-4 text-zinc-500">{staff.role || '-'}</td>
                    <td className="py-4 px-4 text-zinc-500">{staff.birthday || '-'}</td>
                    <td className="py-4 px-4 text-zinc-500">
                      <div className="flex flex-wrap gap-1">
                        {staff.services?.map(sId => {
                          const s = services.find(x => x.id === sId);
                          return s ? (
                            <span key={s.id} className="px-2 py-0.5 bg-white-light dark:bg-zinc-800 rounded-full text-xs border border-black-light dark:border-dark-light text-black dark:text-white font-medium">
                              {s.name}
                            </span>
                          ) : null;
                        })}
                        {(!staff.services || staff.services.length === 0) && '-'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${staff.isActive ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                        {staff.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center pr-6">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" onClick={() => handleOpenModal(staff)}>
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="p-2 text-zinc-500 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors" 
                          title="Configurar Horario"
                          onClick={() => {
                            setScheduleStaff({ id: staff.id, name: staff.name });
                            setIsScheduleModalOpen(true);
                          }}
                        >
                          <Calendar size={16} />
                        </button>
                        <button className="p-2 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" onClick={() => handleDelete(staff.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-black-light dark:border-dark-light animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {form.id ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                {form.id ? 'Editar Trabajadora' : 'Nueva Trabajadora'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-black dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold mb-2 block text-black dark:text-white">Nombre *</label>
                <input 
                  type="text" 
                  className="form-input rounded-xl border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 text-black dark:text-white w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Ej: María Pérez"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-black dark:text-white">Cumpleaños</label>
                  <BirthdayPicker 
                    value={form.birthday}
                    onChange={(val) => setForm({...form, birthday: val})}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-black dark:text-white">Especialidad / Rol</label>
                  <input 
                    type="text" 
                    className="form-input rounded-xl border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50 text-black dark:text-white w-full focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm" 
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                    placeholder="Ej: Cosmiatra"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-black dark:text-white">Servicios que ofrece</label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                    onClick={() => {
                      if (form.services.length === services.length && services.length > 0) {
                        setForm({ ...form, services: [] });
                      } else {
                        setForm({ ...form, services: services.map(s => s.id) });
                      }
                    }}
                  >
                    {form.services.length === services.length && services.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-black-light dark:border-dark-light p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-3 cursor-pointer text-sm p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded-full border-black-light dark:border-dark-light text-primary focus:ring-primary focus:ring-offset-0 w-4 h-4 cursor-pointer transition-all"
                        checked={form.services.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                      />
                      <span className="truncate text-black dark:text-white">{s.name}</span>
                    </label>
                  ))}
                  {services.length === 0 && <span className="text-xs text-zinc-500">No hay servicios disponibles</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-black-light dark:border-dark-light">
                <input 
                  type="checkbox" 
                  id="isActive"
                  className="rounded-full border-black-light dark:border-dark-light text-primary focus:ring-primary focus:ring-offset-0 w-5 h-5 cursor-pointer transition-all"
                  checked={form.isActive}
                  onChange={e => setForm({...form, isActive: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-sm cursor-pointer select-none font-medium text-black dark:text-white">Trabajadora activa en el sistema</label>
              </div>
            </div>

            <div className="p-6 border-t border-black-light dark:border-dark-light flex justify-end gap-3">
              <button 
                className="btn btn-outline-danger rounded-xl px-6"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition-all"
                onClick={handleSave}
              >
                Guardar Trabajadora
              </button>
            </div>
          </div>
        </div>
      )}

      {isScheduleModalOpen && scheduleStaff && (
        <ScheduleConfigModal 
          staffId={scheduleStaff.id}
          staffName={scheduleStaff.name}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setScheduleStaff(null);
          }}
        />
      )}
    </div>
  );
}
