import { crmToast } from '../../../hooks/useToast';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useMarketingContacts, useUpsertMarketingContact, useBatchInsertMarketingContacts, useDeleteMarketingContact, useDeleteMarketingContactsByTag } from '../../../hooks/queries/useMarketingContacts';
import { Search, Plus, Trash2, Tag, Upload, Users, X } from 'lucide-react';
import Card from '@/components/legacy/Card';

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
  const [newTags, setNewTags] = useState('');
  const [batchText, setBatchText] = useState('');

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
    const phone = newPhone.trim();

    if (contacts.some(c => c.phone === phone)) {
      crmToast.error('Este número de teléfono ya existe en la base de contactos.');
      return;
    }

    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    upsertContact.mutate({ phone, name: newName.trim() || undefined, tags }, {
      onSuccess: () => { setIsAddOpen(false); setNewPhone(''); setNewName(''); setNewTags(''); }
    });
  };

  const handleBatch = () => {
    const rows = batchText.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { phone: parts[0], name: parts[1] || undefined, tags: parts.slice(2).filter(Boolean) };
    }).filter(r => r.phone);
    if (!rows.length) return;
    batchInsert.mutate(rows, { onSuccess: () => { setIsBatchOpen(false); setBatchText(''); } });
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="m-0 text-[1.05rem] font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Base de Contactos
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[0.75rem] px-2 py-0.5 rounded-full font-bold">{contacts.length}</span>
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-bold transition-colors border border-slate-200 dark:border-slate-700 shadow-sm" onClick={() => setIsDeleteTagOpen(true)}>
            <Trash2 size={14} /> Eliminar Lote
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors border border-slate-200 dark:border-slate-700 shadow-sm" onClick={() => setIsBatchOpen(true)}>
            <Upload size={14} /> Importar Lote
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm shadow-emerald-500/20" onClick={() => setIsAddOpen(true)}>
            <Plus size={14} /> Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <Search size={16} className="text-slate-400" />
          <input
            className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-white placeholder:text-slate-400"
            placeholder="Buscar por teléfono, nombre o etiqueta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm dark:shadow-slate-900/50">
            <tr>
              <th className="px-5 py-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Teléfono</th>
              <th className="px-5 py-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Nombre</th>
              <th className="px-5 py-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Etiquetas</th>
              <th className="px-5 py-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Agregado</th>
              <th className="px-5 py-3 text-[0.75rem] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 w-[60px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoading && <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Cargando contactos...</td></tr>}
            {!isLoading && contacts.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                {search ? 'No se encontraron contactos con esa búsqueda.' : 'Aún no hay contactos. Agrega el primero.'}
              </td></tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3 font-mono text-[0.88rem] font-semibold text-slate-900 dark:text-slate-200">{c.phone}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400 text-sm">{c.name || <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {(c.tags || []).length === 0
                      ? <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                      : (c.tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                          <Tag size={9} /> {tag}
                        </span>
                      ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-[0.8rem] text-slate-500 dark:text-slate-400">
                  {new Date(c.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
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
                  <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors">
                    Siguiente Página ({Math.min(PAGE_SIZE, totalCount - page * PAGE_SIZE)} restantes)
                  </button>
                </td>
              </tr>
            )}
            {page > 1 && (
              <tr>
                <td colSpan={5} className="p-4 text-center">
                  <button onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={e  => { mouseDownOnBackdropAdd.current = e.target === e.currentTarget; }}
          onMouseUp={e    => { if (mouseDownOnBackdropAdd.current && e.target === e.currentTarget) setIsAddOpen(false); mouseDownOnBackdropAdd.current = false; }}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="m-0 text-[1.05rem] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-emerald-500" /> Nuevo Contacto
              </h3>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsAddOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Teléfono *</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="51999999999"
                  autoFocus
                />
                <small className="text-slate-400 dark:text-slate-500 text-[0.75rem]">Incluye el código de país sin "+" (ej: 51 para Perú)</small>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre (opcional)</label>
                <input 
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={newName} onChange={e => setNewName(e.target.value)} placeholder="Juan Pérez" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Etiquetas (separadas por coma)</label>
                <input 
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="cliente, vip, surco" 
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <button className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsAddOpen(false)}>Cancelar</button>
              <button className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-lg shadow-sm transition-all" onClick={handleAdd} disabled={!newPhone.trim() || upsertContact.isPending}>
                {upsertContact.isPending ? 'Guardando...' : 'Guardar Contacto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Importar Lote */}
      {isBatchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={e  => { mouseDownOnBackdropBatch.current = e.target === e.currentTarget; }}
          onMouseUp={e    => { if (mouseDownOnBackdropBatch.current && e.target === e.currentTarget) setIsBatchOpen(false); mouseDownOnBackdropBatch.current = false; }}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="m-0 text-[1.05rem] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={18} className="text-blue-500" /> Importar Lote
              </h3>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsBatchOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <p className="m-0 text-[0.83rem] text-blue-800 dark:text-blue-300 leading-relaxed">
                  Ingresa <strong>un contacto por línea</strong>.<br />
                  Formato: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-700 font-mono text-[0.75rem]">Teléfono, Nombre, Etiqueta1, Etiqueta2</code>
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Lista de contactos</label>
                <textarea
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono leading-relaxed"
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  rows={8}
                  placeholder={"51999111222, Juan Perez, cliente, vip\n51999333444, Maria Lopez, lead"}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <button className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsBatchOpen(false)}>Cancelar</button>
              <button className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-lg shadow-sm transition-all" onClick={handleBatch} disabled={!batchText.trim() || batchInsert.isPending}>
                {batchInsert.isPending ? 'Importando...' : 'Importar Contactos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Eliminar Lote */}
      {isDeleteTagOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={e  => { mouseDownOnBackdropDeleteTag.current = e.target === e.currentTarget; }}
          onMouseUp={e    => { if (mouseDownOnBackdropDeleteTag.current && e.target === e.currentTarget) setIsDeleteTagOpen(false); mouseDownOnBackdropDeleteTag.current = false; }}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/20">
              <h3 className="m-0 text-[1.05rem] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <Trash2 size={18} /> Eliminar Grupo de Contactos
              </h3>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsDeleteTagOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50">
                <p className="m-0 text-[0.83rem] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Ingresa el nombre de la etiqueta. <strong>Todos los contactos</strong> que tengan esta etiqueta serán eliminados de la base permanentemente.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.75rem] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre de Etiqueta</label>
                <input
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  value={deleteTagText}
                  onChange={e => setDeleteTagText(e.target.value)}
                  placeholder="Ej: promo junio 2"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <button className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsDeleteTagOpen(false)}>Cancelar</button>
              <button className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-lg shadow-sm transition-all" onClick={handleDeleteByTag} disabled={!deleteTagText.trim() || deleteByTag.isPending}>
                {deleteByTag.isPending ? 'Eliminando...' : 'Sí, Eliminar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
