import { crmToast } from '../../../hooks/useToast';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useMarketingContacts, useUpsertMarketingContact, useBatchInsertMarketingContacts, useDeleteMarketingContact, useDeleteMarketingContactsByTag } from '../../../hooks/queries/useMarketingContacts';
import { Search, Plus, Trash2, Tag, Upload, Users, X, Phone, User, Mail, Calendar, FileText, Info, CheckSquare, Loader2, XCircle } from 'lucide-react';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';

export function MarketingContactsManager() {
  const PAGE_SIZE = 100;
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: contactsData = { data: [], count: 0 }, isLoading } = useMarketingContacts(page, PAGE_SIZE, debouncedSearch);
  const contacts = contactsData.data;
  const totalCount = contactsData.count;

  const upsertContact = useUpsertMarketingContact();
  const batchInsert = useBatchInsertMarketingContacts();
  const deleteContact = useDeleteMarketingContact();
  const deleteByTag = useDeleteMarketingContactsByTag();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isDeleteTagOpen, setIsDeleteTagOpen] = useState(false);
  const [deleteTagText, setDeleteTagText] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newBirthday, setNewBirthday] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newTags, setNewTags] = useState('');
  const [batchText, setBatchText] = useState('');
  
  const [optInSource, setOptInSource] = useState('importación manual');
  const [hasOptInConsent, setHasOptInConsent] = useState(false);

  const mouseDownOnBackdropAdd   = useRef(false);
  const mouseDownOnBackdropBatch = useRef(false);
  const mouseDownOnBackdropDeleteTag = useRef(false);

  const handleDeleteByTag = () => {
    if (!deleteTagText.trim()) return;
    const tag = deleteTagText.trim();
    if (window.confirm(`¿Estás seguro de eliminar TODOS los contactos que tengan la etiqueta "${tag}"? Esta acción no se puede deshacer.`)) {
      deleteByTag.mutate(tag, {
        onSuccess: () => {
          setIsDeleteTagOpen(false);
          setDeleteTagText('');
          crmToast.success(`Contactos con la etiqueta "${tag}" eliminados correctamente.`);
        },
        onError: () => {
          crmToast.error(`Error al eliminar los contactos.`);
        }
      });
    }
  };

  const handleAdd = () => {
    if (!newPhone.trim()) return;
    if (!hasOptInConsent) {
      crmToast.error('Debes confirmar el consentimiento previo (Opt-In).');
      return;
    }
    const phone = newPhone.trim();

    if (contacts.some(c => c.phone === phone)) {
      crmToast.error('Este número de teléfono ya existe en la base de contactos.');
      return;
    }

    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    upsertContact.mutate({ 
      phone, 
      name: newName.trim() || undefined, 
      email: newEmail.trim() || undefined,
      birthday: newBirthday.trim() || undefined,
      notes: newNotes.trim() || undefined,
      tags, 
      opt_in_source: optInSource 
    }, {
      onSuccess: () => { 
        setIsAddOpen(false); 
        setNewPhone(''); 
        setNewName(''); 
        setNewEmail('');
        setNewBirthday('');
        setNewNotes('');
        setNewTags(''); 
        setHasOptInConsent(false); 
        setOptInSource('importación manual'); 
      }
    });
  };

  const handleBatch = () => {
    if (!hasOptInConsent) {
      crmToast.error('Debes confirmar el consentimiento previo (Opt-In).');
      return;
    }
    const rows = batchText.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { phone: parts[0], name: parts[1] || undefined, tags: parts.slice(2).filter(Boolean), opt_in_source: optInSource };
    }).filter(r => r.phone);
    if (!rows.length) return;
    batchInsert.mutate(rows, { onSuccess: () => { setIsBatchOpen(false); setBatchText(''); setHasOptInConsent(false); setOptInSource('importación manual'); } });
  };

  return (
    <div className="panel p-0 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h3 className="m-0 text-[1.05rem] font-bold text-dark dark:text-white-light flex items-center gap-2">
            Base de Contactos
            <span className="badge badge-outline-primary rounded-full">{contacts.length}</span>
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-outline-danger btn-sm" onClick={() => setIsDeleteTagOpen(true)}>
            <Trash2 size={14} className="mr-1" /> Eliminar Lote
          </button>
          <button className="btn btn-outline-primary btn-sm" onClick={() => setIsBatchOpen(true)}>
            <Upload size={14} className="mr-1" /> Importar Lote
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsAddOpen(true)}>
            <Plus size={14} className="mr-1" /> Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white-dark" />
          <input
            className="form-input pl-10"
            placeholder="Buscar por teléfono, nombre o etiqueta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-responsive flex-1 overflow-auto">
        <table className="table-hover w-full min-w-[600px]">
          <thead>
            <tr>
              <th>Teléfono</th>
              <th>Nombre</th>
              <th>Etiquetas</th>
              <th>Agregado</th>
              <th className="w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-8 text-center text-white-dark">Cargando contactos...</td></tr>}
            {!isLoading && contacts.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-white-dark">
                {search ? 'No se encontraron contactos con esa búsqueda.' : 'Aún no hay contactos. Agrega el primero.'}
              </td></tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id}>
                <td className="font-mono font-semibold text-dark dark:text-white-light">{c.phone}</td>
                <td className="text-white-dark">{c.name || <span className="text-white-dark opacity-50">—</span>}</td>
                <td>
                  <div className="flex gap-1.5 flex-wrap">
                    {(c.tags || []).length === 0
                      ? <span className="text-white-dark opacity-50">—</span>
                      : (c.tags || []).map(tag => (
                        <span key={tag} className="badge badge-outline-info flex items-center gap-1 uppercase">
                          <Tag size={9} /> {tag}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="text-white-dark text-xs">
                  {new Date(c.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </td>
                <td className="text-right">
                  <button
                    className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
                    onClick={() => { if (window.confirm('¿Eliminar este contacto?')) deleteContact.mutate(c.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {totalCount > page * PAGE_SIZE && (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  <button onClick={() => setPage(p => p + 1)} className="btn btn-outline-primary btn-sm">
                    Siguiente Página ({Math.min(PAGE_SIZE, totalCount - page * PAGE_SIZE)} restantes)
                  </button>
                </td>
              </tr>
            )}
            {page > 1 && (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  <button onClick={() => setPage(p => p - 1)} className="btn btn-outline-primary btn-sm">
                    Página Anterior
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal — Nuevo Contacto */}
      {isAddOpen && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-y-auto"
          onMouseDown={e  => { mouseDownOnBackdropAdd.current = e.target === e.currentTarget; }}
          onMouseUp={e    => { if (mouseDownOnBackdropAdd.current && e.target === e.currentTarget) setIsAddOpen(false); mouseDownOnBackdropAdd.current = false; }}
        >
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] my-auto">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                Nuevo Contacto
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsAddOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" /> Teléfono *
                  </label>
                  <input
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="51999999999"
                    autoFocus
                  />
                  <small className="text-xs text-zinc-500 font-medium ml-1">Incluye el código de país sin "+" (ej: 51 para Perú)</small>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Nombre (opcional)
                  </label>
                  <input 
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Juan Pérez" 
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Email (opcional)
                  </label>
                  <input 
                    type="email"
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="juan@correo.com" 
                  />
                </div>
                
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Fecha de Nacimiento (opcional)
                  </label>
                  <CustomDatePicker 
                    value={newBirthday}
                    onChangeDate={setNewBirthday}
                    placeholder="Seleccionar fecha"
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                  />
                </div>
                
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notas (opcional)
                  </label>
                  <textarea 
                    className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                    value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Preferencias, alergias, etc." 
                    rows={2}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 border-t border-black-light dark:border-dark-light my-2 pt-6">
                  <h4 className="font-bold text-lg tracking-tight text-black dark:text-white mb-6 flex items-center gap-2">
                    Procedencia y Cumplimiento
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                        <Info className="w-4 h-4 text-primary" /> ¿De dónde obtuviste este número?
                      </label>
                      <input 
                        className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                        value={optInSource} onChange={e => setOptInSource(e.target.value)} placeholder="Ej: Me escribió por Facebook, Formulario web" 
                      />
                      <small className="text-xs text-zinc-500 font-medium ml-1">Te ayuda a recordar el origen para evitar contactar a desconocidos.</small>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" /> Etiquetas (separadas por coma)
                      </label>
                      <input 
                        className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark"
                        value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="cliente, vip, surco" 
                      />
                    </div>
                    
                    <div className="mt-4">
                      <label className="flex items-start gap-4 cursor-pointer group bg-warning/10 dark:bg-warning/5 border border-warning/20 p-5 rounded-2xl transition-colors hover:bg-warning/20">
                        <div className="relative flex items-center mt-0.5">
                          <input 
                            type="checkbox" 
                            className="peer sr-only" 
                            checked={hasOptInConsent}
                            onChange={e => setHasOptInConsent(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-warning/30 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform dark:border-zinc-600 peer-checked:bg-warning"></div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-warning-800 dark:text-warning leading-snug group-hover:text-warning-900 dark:group-hover:text-warning-light transition-colors">
                            Confirmo que este cliente me ha escrito o contactado a mí primero.
                          </span>
                          <span className="text-xs text-warning-700 dark:text-warning/80 leading-relaxed">
                            Ten en cuenta que si envías mensajes masivos a clientes "fríos" o bases de datos compradas, <strong>el riesgo de baneo por parte de WhatsApp es muy alto</strong>.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50">
              <button 
                className="btn btn-outline-secondary rounded-xl px-6" 
                onClick={() => setIsAddOpen(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition" 
                onClick={handleAdd} 
                disabled={!newPhone.trim() || upsertContact.isPending}
              >
                {upsertContact.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </span>
                ) : (
                  'Guardar Contacto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Importar Lote */}
      {isBatchOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={e  => { mouseDownOnBackdropBatch.current = e.target === e.currentTarget; }}
          onMouseUp={e    => { if (mouseDownOnBackdropBatch.current && e.target === e.currentTarget) setIsBatchOpen(false); mouseDownOnBackdropBatch.current = false; }}
        >
          <div className="panel border-0 p-0 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
              <h3 className="m-0 text-lg font-bold text-dark dark:text-white-light flex items-center gap-2">
                <Upload size={18} className="text-info" /> Importar Lote
              </h3>
              <button className="text-white-dark hover:text-dark dark:hover:text-white-light" onClick={() => setIsBatchOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="bg-info-light dark:bg-info-dark-light p-3 rounded-lg border border-info/20">
                <p className="m-0 text-sm text-info-800 dark:text-info leading-relaxed">
                  Ingresa <strong>un contacto por línea</strong>.<br />
                  Formato: <code className="bg-white dark:bg-dark px-1.5 py-0.5 rounded border border-info/30 font-mono text-xs">Teléfono, Nombre, Etiqueta1, Etiqueta2</code>
                </p>
              </div>
              <div>
                <label className="text-white-dark">Lista de contactos</label>
                <textarea
                  className="form-textarea font-mono text-sm leading-relaxed"
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  rows={8}
                  placeholder={"51999111222, Juan Perez, cliente, vip\n51999333444, Maria Lopez, lead"}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="text-white-dark">¿De dónde obtuviste estos números?</label>
                <input 
                  className="form-input"
                  value={optInSource} onChange={e => setOptInSource(e.target.value)} placeholder="Ej: Me escribieron por Facebook, Clientes de la tienda" 
                />
                <small className="text-white-dark mt-1 block">Te ayuda a recordar el origen para evitar contactar a desconocidos.</small>
              </div>
              <div className="flex items-start gap-2 bg-warning-light dark:bg-warning-dark-light p-3 rounded-lg border border-warning/20 mt-2">
                <input type="checkbox" id="consent-batch" className="form-checkbox text-warning mt-1" checked={hasOptInConsent} onChange={e => setHasOptInConsent(e.target.checked)} />
                <label htmlFor="consent-batch" className="text-xs text-warning-800 dark:text-warning leading-snug m-0">
                  <strong>Confirmo que todos estos clientes me han escrito o contactado a mí primero.</strong><br/>
                  Ten en cuenta que si envías mensajes masivos a clientes "fríos" o bases de datos compradas, <strong>el riesgo de baneo por parte de WhatsApp es muy alto</strong>.
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
              <button className="btn btn-outline-danger" onClick={() => setIsBatchOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleBatch} disabled={!batchText.trim() || batchInsert.isPending}>
                {batchInsert.isPending ? 'Importando...' : 'Importar Contactos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Eliminar Lote */}
      {isDeleteTagOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onMouseDown={e  => { mouseDownOnBackdropDeleteTag.current = e.target === e.currentTarget; }}
          onMouseUp={e    => { if (mouseDownOnBackdropDeleteTag.current && e.target === e.currentTarget) setIsDeleteTagOpen(false); mouseDownOnBackdropDeleteTag.current = false; }}
        >
          <div className="panel border-0 p-0 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#e0e6ed] dark:border-[#1b2e4b]">
              <h3 className="m-0 text-lg font-bold text-danger flex items-center gap-2">
                <Trash2 size={18} /> Eliminar Grupo de Contactos
              </h3>
              <button className="text-white-dark hover:text-dark dark:hover:text-white-light" onClick={() => setIsDeleteTagOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="bg-warning-light dark:bg-warning-dark-light p-3 rounded-lg border border-warning/20">
                <p className="m-0 text-sm text-warning-800 dark:text-warning leading-relaxed">
                  Ingresa el nombre de la etiqueta. <strong>Todos los contactos</strong> que tengan esta etiqueta serán eliminados de la base permanentemente.
                </p>
              </div>
              <div>
                <label className="text-white-dark">Nombre de Etiqueta</label>
                <input
                  className="form-input"
                  value={deleteTagText}
                  onChange={e => setDeleteTagText(e.target.value)}
                  placeholder="Ej: promo junio 2"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-[#e0e6ed] dark:border-[#1b2e4b]">
              <button className="btn btn-outline-secondary" onClick={() => setIsDeleteTagOpen(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDeleteByTag} disabled={!deleteTagText.trim() || deleteByTag.isPending}>
                {deleteByTag.isPending ? 'Eliminando...' : 'Sí, Eliminar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
