'use client';

import { useState, useMemo } from 'react';
import { Search, Edit, Plus, User, Mail, Calendar, FileText, CheckCircle, XCircle, Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { archiveContactsAction, upsertContactAction } from './actions';
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
  notes?: string | null;
  total_visits?: number;
  last_visit_at?: string | null;
  last_service_name?: string | null;
}

export function ClientsTable({ initialClients }: { initialClients: ClientMetric[] }) {
  const [clients, setClients] = useState<ClientMetric[]>(initialClients);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    id: '',
    phone: '',
    name: '',
    email: '',
    birthday: '',
    notes: ''
  });

  // Formatting dates
  const formatDate = (iso: string | null | undefined, includeTime = false) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-ES', { 
      day: '2-digit', month: 'short', year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
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
        birthday: client.birthday || '',
        notes: client.notes || ''
      });
    } else {
      setForm({
        id: '',
        phone: '',
        name: '',
        email: '',
        birthday: '',
        notes: ''
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
      birthday: form.birthday,
      notes: form.notes
    });
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(idToUse ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente');
      setIsModalOpen(false);
      // Optimistic update or reload
      window.location.reload();
    }
    setIsSubmitting(false);
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
          className="btn btn-primary rounded-xl transition-all gap-2 w-full sm:w-auto px-6"
        >
          <Plus className="w-5 h-5" /> Nuevo Cliente
        </button>
      </div>

      {/* Table Area */}
      <div className="table-responsive min-h-[400px]">
        <table className="table-hover w-full min-w-[1000px]">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest pl-6">Cliente</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Contacto</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Cumpleaños</th>
              <th className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Atenciones</th>
              <th className="text-left py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Último Servicio</th>
              <th className="text-right py-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest pr-6">Acciones</th>
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
                  className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                  onDoubleClick={() => handleOpenModal(client)}
                >
                  <td className="py-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {client.name?.charAt(0) || <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-black dark:text-white">{client.name || 'Sin nombre'}</div>
                        {client.notes && (
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]" title={client.notes}>
                            {client.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
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
                  <td className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white-light dark:bg-zinc-800 text-black dark:text-white text-sm font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {client.birthday || '-'}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="font-semibold text-black dark:text-white text-lg">{client.total_visits || 0}</span>
                  </td>
                  <td>
                    {client.last_service_name ? (
                      <div>
                        <div className="font-medium text-black dark:text-white text-sm">{client.last_service_name}</div>
                        <div className="text-xs text-zinc-500">el {formatDate(client.last_visit_at)}</div>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="text-right pr-6">
                    <button 
                      onClick={() => handleOpenModal(client)}
                      className="btn btn-sm btn-outline-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit className="w-4 h-4" /> Editar
                    </button>
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

                <div className="space-y-4 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notas Adicionales
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Detalles médicos, preferencias, etc." 
                    className="form-textarea rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm w-full"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
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
                className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition-all" 
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
