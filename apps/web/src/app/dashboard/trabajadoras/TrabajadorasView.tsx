'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import { getStaffListAction, upsertStaffAction, deleteStaffAction } from './actions';
import { SpaStaff } from '@/types/crm';
import { supabase } from '@/shared/utils/supabase';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { BirthdayPicker } from '@/components/ui/BirthdayPicker';

const MySwal = withReactContent(Swal);

export default function TrabajadorasView() {
  const [staffList, setStaffList] = useState<SpaStaff[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          <h2 className="text-2xl font-bold text-black dark:text-white">Gestión de Trabajadoras</h2>
          <p className="text-zinc-500">Registra a tu equipo y asigna los servicios que realizan.</p>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => handleOpenModal()}
        >
          <UserPlus size={18} />
          Nueva Trabajadora
        </button>
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="table-responsive">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando trabajadoras...</div>
          ) : staffList.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-500">
              <UserPlus size={48} className="mb-4 opacity-50" />
              <p>No hay trabajadoras registradas.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                <tr>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Especialidad</th>
                  <th className="p-4">Cumpleaños</th>
                  <th className="p-4">Servicios Asignados</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-medium text-black dark:text-white">{staff.name}</td>
                    <td className="p-4 text-zinc-500">{staff.role || '-'}</td>
                    <td className="p-4 text-zinc-500">{staff.birthday || '-'}</td>
                    <td className="p-4 text-zinc-500">
                      <div className="flex flex-wrap gap-1">
                        {staff.services?.map(sId => {
                          const s = services.find(x => x.id === sId);
                          return s ? (
                            <span key={s.id} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs border border-zinc-200 dark:border-zinc-700">
                              {s.name}
                            </span>
                          ) : null;
                        })}
                        {(!staff.services || staff.services.length === 0) && '-'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${staff.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {staff.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="text-primary hover:text-primary/80" onClick={() => handleOpenModal(staff)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="text-danger hover:text-danger/80" onClick={() => handleDelete(staff.id)}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0e1726] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-lg font-bold text-black dark:text-white">
                {form.id ? 'Editar Trabajadora' : 'Nueva Trabajadora'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-semibold mb-1 block">Nombre *</label>
                <input 
                  type="text" 
                  className="form-input rounded-xl border-zinc-200 dark:border-zinc-700 w-full" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Ej: María Pérez"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Cumpleaños</label>
                  <BirthdayPicker 
                    value={form.birthday}
                    onChange={(val) => setForm({...form, birthday: val})}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Especialidad / Rol</label>
                  <input 
                    type="text" 
                    className="form-input rounded-xl border-zinc-200 dark:border-zinc-700 w-full" 
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                    placeholder="Ej: Cosmiatra"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Servicios que ofrece</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-zinc-200 dark:border-zinc-700 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 max-h-48 overflow-y-auto">
                  {services.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        checked={form.services.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                      />
                      <span className="truncate">{s.name}</span>
                    </label>
                  ))}
                  {services.length === 0 && <span className="text-xs text-zinc-500">No hay servicios disponibles</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <input 
                  type="checkbox" 
                  id="isActive"
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  checked={form.isActive}
                  onChange={e => setForm({...form, isActive: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-sm cursor-pointer select-none">Trabajadora activa en el sistema</label>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border-t border-black-light dark:border-dark-light flex justify-end gap-3">
              <button 
                className="btn btn-outline-danger"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSave}
              >
                Guardar Trabajadora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
