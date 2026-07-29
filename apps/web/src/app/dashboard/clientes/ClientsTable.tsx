'use client';

import { useMemo, useState, useEffect, useTransition } from 'react';
import {
  formatBusinessDateLabel,
  formatBusinessDateTime,
  formatDateOnly,
} from '@/lib/business-date';
import { useRouter } from 'next/navigation';
import {
  Search,
  Edit,
  Plus,
  User,
  Mail,
  Calendar,
  FileText,
  XCircle,
  Inbox,
  Archive,
  Share2,
  Tag,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { upsertContactAction, deleteContactAction } from './actions';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { BirthdayPicker } from '@/components/ui/BirthdayPicker';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ClientProfileInteractiveName } from '@/components/clients/ClientProfilePopover';
import { normalizePeruPhone } from '@/shared/utils/phone';

const MySwal = withReactContent(Swal);

export interface ClientMetric {
  id: string;
  phone: string;
  name: string | null;
  is_archived: boolean;
  created_at: string;
  email?: string | null;
  document_number?: string | null;
  birthday?: string | null;
  opt_in_source?: string | null;
  allergies_and_conditions?: string | null;
  preferences?: string | null;
  internal_notes?: string | null;
  total_spent?: number;
  total_visits?: number;
  last_visit_at?: string | null;
  last_service_name?: string | null;
  customer_segment?: 'VIP' | 'Frecuente' | 'Nuevo' | 'En Riesgo' | 'Perdido' | 'Ocasional';
}

const OPT_IN_SOURCE_OPTIONS = [
  { value: '', label: 'No registrado' },
  { value: 'Presencial / pasó por el local', label: 'Presencial / pasó por el local' },
  { value: 'Recomendación', label: 'Recomendación' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Google / Google Maps', label: 'Google / Google Maps' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Página web', label: 'Página web' },
  { value: 'Anuncio pagado', label: 'Anuncio pagado' },
  { value: 'Otro', label: 'Otro (Especificar)' },
];

const CUSTOMER_SEGMENT_OPTIONS = [
  { value: 'Nuevo', label: 'Nuevo' },
  { value: 'Ocasional', label: 'Ocasional' },
  { value: 'Frecuente', label: 'Frecuente' },
  { value: 'VIP', label: 'VIP' },
  { value: 'En Riesgo', label: 'En riesgo' },
  { value: 'Perdido', label: 'Perdido' },
];

export function ClientsTable({ initialClients }: { initialClients: ClientMetric[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [clients, setClients] = useState<ClientMetric[]>(initialClients);

  // Sync state from server props after a router.refresh()
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customOptInSource, setCustomOptInSource] = useState('');

  const [form, setForm] = useState({
    id: '',
    phone: '',
    name: '',
    email: '',
    documentNumber: '',
    birthday: '',
    optInSource: '',
    allergiesAndConditions: '',
    preferences: '',
    internalNotes: '',
    customerSegment: 'Nuevo',
  });

  // Formatting dates
  const formatDate = (iso: string | null | undefined, includeTime = false) => {
    if (!iso) return '-';
    const isDateOnly = !iso.includes('T') || iso.includes('T00:00:00');
    if (isDateOnly) return formatDateOnly(iso.split('T')[0]);
    return includeTime ? formatBusinessDateTime(iso) : formatBusinessDateLabel(iso);
  };

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (c.is_archived) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(query) ?? false;
        const matchesPhone = c.phone.toLowerCase().includes(query);
        const matchesEmail = c.email?.toLowerCase().includes(query) ?? false;
        const matchesSource = c.opt_in_source?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesSource) return false;
      }
      return true;
    });
  }, [clients, search]);

  const handleOpenModal = (client?: ClientMetric) => {
    if (client) {
      const sourceVal = client.opt_in_source || '';
      const isKnown = OPT_IN_SOURCE_OPTIONS.some((o) => o.value === sourceVal);
      setForm({
        id: client.id,
        phone: client.phone,
        name: client.name || '',
        email: client.email || '',
        documentNumber: client.document_number || '',
        birthday: client.birthday || '',
        optInSource: isKnown ? sourceVal : sourceVal ? 'Otro' : '',
        allergiesAndConditions: client.allergies_and_conditions || '',
        preferences: client.preferences || '',
        internalNotes: client.internal_notes || '',
        customerSegment: client.customer_segment || 'Ocasional',
      });
      setCustomOptInSource(isKnown ? '' : sourceVal);
    } else {
      setForm({
        id: '',
        phone: '',
        name: '',
        email: '',
        documentNumber: '',
        birthday: '',
        optInSource: '',
        allergiesAndConditions: '',
        preferences: '',
        internalNotes: '',
        customerSegment: 'Nuevo',
      });
      setCustomOptInSource('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const normalizedPhone = normalizePeruPhone(form.phone);
    if (!normalizedPhone) {
      toast.error('Ingresa un celular peruano de 9 dígitos, por ejemplo 996 552 871.');
      return;
    }

    if (!form.id) {
      const existing = clients.find((c) => normalizePeruPhone(c.phone) === normalizedPhone);
      if (existing) {
        MySwal.fire({
          title: 'Número Registrado',
          html: `Este número ya pertenece a <strong>${existing.name || 'un cliente'}</strong>.<br/><br/>¿Deseas actualizar sus datos o registrar otro número?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, actualizar datos',
          cancelButtonText: 'Cancelar',
          customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-outline-danger' },
        }).then((result) => {
          if (result.isConfirmed) {
            executeSave(existing.id, normalizedPhone);
          }
        });
        return;
      }
    }

    executeSave(form.id, normalizedPhone);
  };

  const executeSave = async (idToUse: string, normalizedPhone: string) => {
    setIsSubmitting(true);
    const finalSource = form.optInSource === 'Otro' ? customOptInSource.trim() : form.optInSource;

    const res = await upsertContactAction({
      phone: normalizedPhone,
      name: form.name,
      email: form.email,
      documentNumber: form.documentNumber,
      birthday: form.birthday,
      optInSource: finalSource,
      allergiesAndConditions: form.allergiesAndConditions,
      preferences: form.preferences,
      internalNotes: form.internalNotes,
      customerSegment: form.customerSegment,
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(
        idToUse ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente',
      );
      setIsModalOpen(false);
      setClients((prev) => {
        const existingIndex = prev.findIndex(
          (c) => normalizePeruPhone(c.phone) === normalizedPhone || (idToUse && c.id === idToUse),
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            name: form.name,
            phone: normalizedPhone,
            email: form.email,
            document_number: form.documentNumber,
            birthday: form.birthday,
            opt_in_source: finalSource,
            allergies_and_conditions: form.allergiesAndConditions,
            preferences: form.preferences,
            internal_notes: form.internalNotes,
            customer_segment: form.customerSegment as ClientMetric['customer_segment'],
          };
          return updated;
        }
        const newClient: ClientMetric = {
          id: idToUse || res.data?.id || String(Date.now()),
          phone: normalizedPhone,
          name: form.name,
          email: form.email,
          document_number: form.documentNumber,
          birthday: form.birthday,
          opt_in_source: finalSource,
          allergies_and_conditions: form.allergiesAndConditions,
          preferences: form.preferences,
          internal_notes: form.internalNotes,
          customer_segment: form.customerSegment as ClientMetric['customer_segment'],
          is_archived: false,
          created_at: new Date().toISOString(),
        };
        return [newClient, ...prev];
      });
      startTransition(() => {
        router.refresh();
      });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (client: ClientMetric, e: React.MouseEvent) => {
    e.stopPropagation();
    MySwal.fire({
      title: '¿Archivar cliente?',
      html: `Se ocultará a <strong>${client.name || client.phone}</strong> de la lista activa.<br/>Su historial de atenciones y pagos se conservará.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-outline-secondary' },
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await deleteContactAction(client.id);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success('Cliente archivado');
          setClients((prev) => prev.filter((c) => c.id !== client.id));
          startTransition(() => {
            router.refresh();
          });
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar / Filters */}
      <div className="p-4 sm:p-6 border-b border-black-light dark:border-dark-light flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por teléfono, nombre, correo o canal..."
            className="form-input pl-10 rounded-xl border-black-light dark:border-dark-light focus:ring-primary focus:border-primary transition-shadow w-full bg-white dark:bg-dark"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary rounded-xl gap-2 w-full sm:w-auto px-6 min-h-[44px] flex items-center justify-center"
        >
          <Plus className="w-5 h-5" /> Nuevo Cliente
        </button>
      </div>

      {/* Main Container */}
      <div className="p-4 sm:p-6 flex-1 min-h-[400px]">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-4 border border-black-light dark:border-dark-light">
              <Inbox className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-black dark:text-white mb-1">
              Sin clientes
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mb-4 text-center">
              No se encontraron registros que coincidan con la búsqueda.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-zinc-50 dark:bg-zinc-900/50">
                  <tr className="border-b border-black-light dark:border-dark-light">
                    <th className="py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                      Cliente
                    </th>
                    <th className="text-center py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                      Contacto & Origen
                    </th>
                    <th className="text-center py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                      Segmento
                    </th>
                    <th className="numeric-column py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                      Visitas
                    </th>
                    <th className="numeric-column py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                      LTV
                    </th>
                    <th className="text-left py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                      Último Servicio
                    </th>
                    <th className="text-right py-4 px-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black-light dark:divide-dark-light">
                  {filteredClients.map((client) => (
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
                            <ClientProfileInteractiveName client={client} />
                            {client.birthday && (
                              <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" /> {client.birthday}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="numeric-column py-4 px-4">
                        <div className="text-sm font-semibold text-black dark:text-white">
                          +{client.phone}
                        </div>
                        <div className="text-xs text-zinc-500 flex justify-center items-center gap-1">
                          {client.email ? (
                            <>
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{client.email}</span>
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                        {client.opt_in_source && (
                          <div className="text-xs text-primary font-semibold mt-0.5">
                            {client.opt_in_source}
                          </div>
                        )}
                      </td>
                      <td className="numeric-column py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            client.customer_segment === 'VIP'
                              ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              : client.customer_segment === 'Frecuente'
                                ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                : client.customer_segment === 'Nuevo'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                  : client.customer_segment === 'En Riesgo'
                                    ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                                    : client.customer_segment === 'Perdido'
                                      ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                                      : 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          }`}
                        >
                          {client.customer_segment || 'Ocasional'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-black dark:text-white text-lg">
                          {client.total_visits || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          S/ {client.total_spent || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {client.last_service_name ? (
                          <div>
                            <div className="font-medium text-black dark:text-white text-sm">
                              {client.last_service_name}
                            </div>
                            <div className="text-xs text-zinc-500">
                              el {formatDate(client.last_visit_at)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2" role="group" aria-label={`Acciones de ${client.name || client.phone}`}>
                          <button
                            type="button"
                            onClick={() => handleOpenModal(client)}
                            className="p-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Editar"
                            aria-label={`Editar a ${client.name || client.phone}`}
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(client, e)}
                            className="p-2 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Archivar cliente"
                            aria-label={`Archivar a ${client.name || client.phone}`}
                          >
                            <Archive className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white dark:bg-dark border border-black-light/50 dark:border-dark-light rounded-2xl p-4 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                        {client.name?.charAt(0) || <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <ClientProfileInteractiveName client={client} />
                        <div className="text-xs text-zinc-500 font-medium">+{client.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label={`Acciones de ${client.name || client.phone}`}>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(client)}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        aria-label={`Editar a ${client.name || client.phone}`}
                        title="Editar cliente"
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDelete(client, event)}
                        className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 flex items-center justify-center transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
                        aria-label={`Archivar a ${client.name || client.phone}`}
                        title="Archivar cliente"
                      >
                        <Archive className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black-light/30 dark:border-dark-light text-xs">
                    <div>
                      <span className="text-zinc-400 block text-xs uppercase tracking-wider font-semibold">
                        Canal Origen
                      </span>
                      <span className="font-semibold text-primary">
                        {client.opt_in_source || 'No registrado'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-xs uppercase tracking-wider font-semibold">
                        Segmento
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {client.customer_segment || 'Ocasional'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-xs uppercase tracking-wider font-semibold">
                        Visitas
                      </span>
                      <span className="font-semibold text-black dark:text-white">
                        {client.total_visits || 0}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-400 block text-xs uppercase tracking-wider font-semibold">
                        Total Gastado
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        S/ {client.total_spent || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal - CRUD Cliente */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-start sm:items-center justify-center p-4 py-4 sm:py-6 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light shrink-0">
              <h3 className="text-2xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {form.id ? (
                    <Edit className="w-5 h-5 text-primary" />
                  ) : (
                    <Plus className="w-5 h-5 text-primary" />
                  )}
                </div>
                {form.id ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                type="button"
                aria-label="Cerrar formulario de cliente"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-white-light dark:bg-zinc-800 p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 min-h-0 overflow-y-auto">
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
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    Teléfono *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 987 654 321"
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={!!form.id}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> DNI / Documento
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 12345678"
                    className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm"
                    value={form.documentNumber}
                    onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha de Cumpleaños
                  </label>
                  <BirthdayPicker
                    value={form.birthday}
                    onChange={(dateStr) => setForm((prev) => ({ ...prev, birthday: dateStr }))}
                  />
                </div>

                {/* Canal de Origen */}
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" /> Canal de Origen
                  </label>
                  <CustomSelect
                    options={OPT_IN_SOURCE_OPTIONS}
                    value={
                      form.optInSource
                        ? {
                            value: form.optInSource,
                            label:
                              OPT_IN_SOURCE_OPTIONS.find((o) => o.value === form.optInSource)
                                ?.label || form.optInSource,
                          }
                        : { value: '', label: 'No registrado' }
                    }
                    onChange={(selected) =>
                      setForm((prev) => ({ ...prev, optInSource: selected ? selected.value : '' }))
                    }
                  />
                  {form.optInSource === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especificar canal de origen..."
                      className="form-input rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm mt-2"
                      value={customOptInSource}
                      onChange={(e) => setCustomOptInSource(e.target.value)}
                    />
                  )}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" aria-hidden="true" />
                    Categoría del cliente
                  </label>
                  <CustomSelect
                    inputId="customer-segment"
                    options={CUSTOMER_SEGMENT_OPTIONS}
                    value={
                      CUSTOMER_SEGMENT_OPTIONS.find(
                        (option) => option.value === form.customerSegment,
                      ) || CUSTOMER_SEGMENT_OPTIONS[1]
                    }
                    onChange={(selected) =>
                      setForm((previous) => ({
                        ...previous,
                        customerSegment: selected?.value || 'Ocasional',
                      }))
                    }
                    aria-label="Categoría del cliente"
                  />
                  <p className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                    La categoría que elijas quedará fija hasta que vuelvas a cambiarla.
                  </p>
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
                    onChange={(e) => setForm({ ...form, allergiesAndConditions: e.target.value })}
                  />
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
                    onChange={(e) => setForm({ ...form, preferences: e.target.value })}
                  />
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
                    onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border-t border-black-light dark:border-dark-light flex justify-end gap-3 shrink-0">
              <button
                type="button"
                className="btn btn-outline-danger rounded-xl px-6 min-h-[44px]"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition min-h-[44px]"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Guardando...
                  </span>
                ) : (
                  'Guardar Cliente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
