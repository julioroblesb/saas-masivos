'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Edit, Plus, User, Mail, Calendar, FileText, CheckCircle, XCircle, Inbox, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { archiveContactsAction, upsertContactAction, deleteContactAction } from './actions';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { BirthdayPicker } from '@/components/ui/BirthdayPicker';

const MySwal = withReactContent(Swal);

interface ClientMetric {
  id: string;
  phone: string;
  name: string | null;
  is_archived: boolean;
  created_at: string;
  email?: string | null;
  birthday?: string | null;
  allergies_and_conditions?: string | null;
  preferences?: string | null;
  internal_notes?: string | null;
  total_spent?: number;
  total_visits?: number;
  last_visit_at?: string | null;
  last_service_name?: string | null;
  customer_segment?: 'VIP' | 'Frecuente' | 'Nuevo' | 'En Riesgo' | 'Perdido' | 'Ocasional';
}

export function ClientsTable({ initialClients }: { initialClients: ClientMetric[] }) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientMetric[]>(initialClients);
  const [search, setSearch] = useState('');
  
  // Mantener sincronizado con servidor
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    id: '',
    phone: '',
    name: '',
    email: '',
    birthday: '',
    allergiesAndConditions: '',
    preferences: '',
    internalNotes: ''
  });

  // Formatting dates
  const formatDate = (iso: string | null | undefined, includeTime = false) => {
    if (!iso) return '-';
    const isDateOnly = !iso.includes('T') || iso.includes('T00:00:00');
    const date = isDateOnly ? new Date(iso.split('T')[0] + 'T00:00:00') : new Date(iso);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short', year: 'numeric',
      ...(includeTime && !isDateOnly ? { hour: '2-digit', minute: '2-digit' } : {})
    });
  };

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Hide archived by default
      if (c.is_archived) return false;

      // Ensure they are actually clients (have a name or >0 visits or an email)
      // If we want this to be the CRM, maybe we filter those with visits or that were manually added
      // We will show all active for now, but prioritize matches.
      
      if (search) {
        const query = search.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(query) ?? false;
        const matchesPhone = c.phone.toLowerCase().includes(query);
        const matchesEmail = c.email?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesPhone && !matchesEmail) return false;
      }
      return true;
    });
  }, [clients, search]);

  const handleOpenModal = (client?: ClientMetric) => {
    if (client) {
      setForm({
        id: client.id,
        phone: client.phone,
        name: client.name || '',
        email: client.email || '',
        documentNumber: client.document_number || '',
        birthday: client.birthday || '',
        allergiesAndConditions: client.allergies_and_conditions || '',
        preferences: client.preferences || '',
        internalNotes: client.internal_notes || ''
      });
    } else {
      setForm({
        id: '',
        phone: '',
        name: '',
        email: '',
        documentNumber: '',
        birthday: '',
        allergiesAndConditions: '',
        preferences: '',
        internalNotes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.phone.trim()) {
      toast.error('El número de teléfono es obligatorio.');
      return;
    }
    
    // Validar si es una creación y el número ya existe
    if (!form.id) {
      const existing = clients.find(c => c.phone === form.phone);
      if (existing) {
        MySwal.fire({
          title: 'Número Registrado',
          html: `Este número ya pertenece a <strong>${existing.name || 'un cliente'}</strong>.<br/><br/>¿Deseas actualizar sus datos o registrar otro número?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, actualizar datos',
          cancelButtonText: 'Cancelar',
          customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-outline-danger' }
        }).then((result) => {
          if (result.isConfirmed) {
            executeSave(existing.id);
          }
        });
        return;
      }
    }
    
    executeSave(form.id);
  };

  const executeSave = async (idToUse: string) => {
    setIsSubmitting(true);
    const res = await upsertContactAction({
      phone: form.phone,
      name: form.name,
      email: form.email,
      documentNumber: form.documentNumber,
      birthday: form.birthday,
      allergiesAndConditions: form.allergiesAndConditions,
      preferences: form.preferences,
      internalNotes: form.internalNotes
    });
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(idToUse ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente');
      setIsModalOpen(false);
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (client: ClientMetric, e: React.MouseEvent) => {
    e.stopPropagation();
    MySwal.fire({
      title: '¿Eliminar cliente?',
      html: `Estás a punto de eliminar a <strong>${client.name || client.phone}</strong>.<br/>Esta acción eliminará también su historial de atenciones y pagos. No se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-outline-secondary' }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteContactAction(client.id);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Cliente eliminado');
          setClients(prev => prev.filter(c => c.id !== client.id));
          router.refresh();
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar / Filters */}
      <div className="p-6 border-b border-black-light dark:border-dark-light flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por teléfono, nombre o correo..." 
            className="form-input pl-10 rounded-xl border-black-light dark:border-dark-light focus:ring-primary focus:border-primary transition-shadow w-full bg-white dark:bg-dark"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn btn-primary rounded-xl gap-2 w-full sm:w-auto px-6"
        >
          <Plus className="w-5 h-5" /> Nuevo Cliente
        </button>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto -mx-6 px-6 min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr className="border-b border-black-light dark:border-dark-light">
              <th className="py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Cliente</th>
              <th className="text-center py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Contacto</th>
              <th className="text-center py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Segmento</th>
              <th className="text-center py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Visitas</th>
              <th className="text-center py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">LTV</th>
              <th className="text-left py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Último Servicio</th>
              <th className="text-right py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black-light dark:divide-dark-light">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 border border-black-light dark:border-dark-light">
                      <Inbox className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-black dark:text-white mb-1">Sin clientes</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mb-4">No se encontraron registros que coincidan con la búsqueda.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClients.map(client => (
                <tr 
                  key={client.id} 
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  onDoubleClick={() => handleOpenModal(client)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {client.name?.charAt(0) || <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-black dark:text-white">{client.name || 'Sin nombre'}</div>
                        {client.birthday && (
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {client.birthday}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="text-sm font-semibold text-black dark:text-white">+{client.phone}</div>
                    <div className="text-xs text-zinc-500 flex justify-center items-center gap-1">
                      {client.email ? (
                        <>
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${client.customer_segment === 'VIP' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : ''}
                      ${client.customer_segment === 'Frecuente' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' : ''}
                      ${client.customer_segment === 'Nuevo' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                      ${client.customer_segment === 'En Riesgo' ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' : ''}
                      ${client.customer_segment === 'Perdido' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : ''}
                      ${client.customer_segment === 'Ocasional' || !client.customer_segment ? 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' : ''}
                    `}>
                      {client.customer_segment || 'Ocasional'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-black dark:text-white text-lg">{client.total_visits || 0}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">${client.total_spent || 0}</span>
                  </td>
                  <td className="py-4 px-4">
                    {client.last_service_name ? (
                      <div>
                        <div className="font-medium text-black dark:text-white text-sm">{client.last_service_name}</div>
                        <div className="text-xs text-zinc-500">el {formatDate(client.last_visit_at)}</div>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(client)}
                        className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(client, e)}
                        className="p-2 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Eliminar permanentemente"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - CRUD Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-2xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {form.id ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                </div>
                {form.id ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Nombre Completo
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: María Pérez" 
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    Teléfono *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: 51987654321" 
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    disabled={!!form.id} // Prevents changing phone if it's the primary key for upsert
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> DNI
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: 12345678" 
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                    value={form.documentNumber}
                    onChange={e => setForm({ ...form, documentNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Correo Electrónico
                  </label>
                  <input 
                    type="email" 
                    placeholder="maria@ejemplo.com" 
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha de Cumpleaños
                  </label>
                  <BirthdayPicker 
                    value={form.birthday}
                    onChange={(dateStr) => setForm(prev => ({ ...prev, birthday: dateStr }))}
                  />
                </div>

                <div className="space-y-4 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-danger" /> Alergias y Condiciones Médicas
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Ej: Rosácea, alergia a almendras, marcapasos..." 
                    className="form-textarea rounded-xl border-black-light dark:border-dark-light focus:border-danger focus:ring-danger shadow-sm w-full"
                    value={form.allergiesAndConditions}
                    onChange={e => setForm({ ...form, allergiesAndConditions: e.target.value })}
                  ></textarea>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Preferencias del Cliente
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Ej: Presión de masaje fuerte, café sin azúcar..." 
                    className="form-textarea rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm w-full"
                    value={form.preferences}
                    onChange={e => setForm({ ...form, preferences: e.target.value })}
                  ></textarea>
                </div>

                <div className="space-y-4 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-500" /> Notas Internas (Staff)
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Apuntes libres de los terapeutas..." 
                    className="form-textarea rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm w-full"
                    value={form.internalNotes}
                    onChange={e => setForm({ ...form, internalNotes: e.target.value })}
                  ></textarea>
                </div>

              </div>
            </div>
            
            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-black-light dark:border-dark-light flex justify-end gap-3">
              <button 
                type="button" 
                className="btn btn-outline-danger rounded-xl px-6" 
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition" 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Guardando...
                  </span>
                ) : 'Guardar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
