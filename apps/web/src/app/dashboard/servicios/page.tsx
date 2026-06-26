'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SpaService } from '@/types/spa';
import { Plus, Edit2, Trash2, Loader2, Scissors, Image as ImageIcon, CheckCircle, XCircle, Tag, FileText, Coins, Percent, Clock, HeartPulse } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function SpaServicesPage() {
  const supabase = createClient();
  const [services, setServices] = useState<SpaService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<SpaService> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        const { data: srvs } = await supabase
          .from('spa_services')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('name');
        if (srvs) {
          setServices(srvs);
        }
      }
    } catch (error) {
      console.error('Error cargando servicios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('spa-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('spa-media')
        .getPublicUrl(fileName);

      setEditingService(prev => prev ? { ...prev, care_image_url: publicUrl } : null);
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      toast.error('Error al subir imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!editingService?.name || !editingService?.price) {
      toast.error('Nombre y precio son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      if (editingService.id) {
        // Update
        const { error } = await supabase
          .from('spa_services')
          .update({
            name: editingService.name,
            description: editingService.description,
            price: editingService.price,
            promo_price: editingService.promo_price,
            duration_days: editingService.duration_days || 0,
            care_instructions: editingService.care_instructions,
            care_image_url: editingService.care_image_url,
            is_active: editingService.is_active ?? true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingService.id);
        
        if (error) throw error;
        toast.success('Servicio actualizado');
      } else {
        // Create
        const { error } = await supabase
          .from('spa_services')
          .insert([{
            company_id: companyId,
            name: editingService.name,
            description: editingService.description,
            price: editingService.price,
            promo_price: editingService.promo_price,
            duration_days: editingService.duration_days || 0,
            care_instructions: editingService.care_instructions,
            care_image_url: editingService.care_image_url,
            is_active: true
          }]);
          
        if (error) throw error;
        toast.success('Servicio creado');
      }
      
      setIsModalOpen(false);
      loadServices();
    } catch (error: any) {
      toast.error('Error guardando servicio: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este servicio?')) return;
    try {
      const { error } = await supabase.from('spa_services').delete().eq('id', id);
      if (error) throw error;
      toast.success('Servicio eliminado');
      loadServices();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const openNew = () => {
    setEditingService({ is_active: true, duration_days: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (service: SpaService) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-black-light dark:border-dark-light">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-3">
            <Scissors className="w-8 h-8 text-primary" /> Servicios del Spa
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
            Administra tu catálogo de servicios, precios e instrucciones de cuidado post-servicio.
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </button>
      </div>

      <div className="flex flex-col">
        {services.length === 0 ? (
          <div className="rounded-3xl bg-white/50 dark:bg-dark/50 text-center py-20">
            <Scissors className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-6 opacity-50" />
            <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium">El catálogo está vacío.</p>
          </div>
        ) : (
          <div className="divide-y divide-black-light/50 dark:divide-dark-dark-light">
            {services.map(service => (
              <div key={service.id} className="group py-10 first:pt-4 flex flex-col md:flex-row md:items-start justify-between gap-8 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 -mx-6 px-6 rounded-3xl">
                
                {/* Info Column */}
                <div className="flex-1 max-w-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-3xl font-extrabold tracking-tight text-black dark:text-white group-hover:text-primary transition-colors">{service.name}</h3>
                    {!service.is_active && (
                      <span className="px-2 py-0.5 rounded-full border border-danger/30 text-danger text-[10px] font-bold uppercase tracking-widest">Inactivo</span>
                    )}
                  </div>
                  
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-6">
                    {service.description || 'Sin descripción detallada.'}
                  </p>
                  
                  {service.duration_days > 0 && (
                     <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                        <Clock className="w-4 h-4" /> Seguimiento post-servicio a los {service.duration_days} días
                     </div>
                  )}
                </div>

                {/* Price & Actions Column */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-6 min-w-[200px]">
                  <div className="text-left md:text-right">
                    <div className="flex items-baseline md:justify-end gap-1">
                      <span className="text-sm font-semibold text-zinc-400">S/</span>
                      <span className="text-4xl font-bold tracking-tighter text-black dark:text-white">{service.price}</span>
                    </div>
                    {service.promo_price && (
                       <div className="mt-1 text-sm font-bold text-success flex items-center md:justify-end gap-1">
                          <Tag className="w-3 h-3" /> Promo S/ {service.promo_price}
                       </div>
                    )}
                  </div>

                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(service)} className="flex items-center justify-center w-10 h-10 rounded-full bg-black-light/20 dark:bg-dark-light text-zinc-600 dark:text-zinc-300 hover:bg-primary hover:text-white transition-all shadow-sm">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="flex items-center justify-center w-10 h-10 rounded-full bg-black-light/20 dark:bg-dark-light text-zinc-600 dark:text-zinc-300 hover:bg-danger hover:text-white transition-all shadow-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - Nuevo / Editar Servicio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] my-auto">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-2xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {editingService?.id ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                </div>
                {editingService?.id ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" /> Nombre del Servicio *
                  </label>
                  <input 
                    type="text" 
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                    value={editingService?.name || ''} 
                    onChange={e => setEditingService({...editingService, name: e.target.value})}
                    placeholder="Ej: Limpieza Facial"
                  />
                </div>
                
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Descripción
                  </label>
                  <textarea 
                    className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                    value={editingService?.description || ''} 
                    onChange={e => setEditingService({...editingService, description: e.target.value})}
                    placeholder="Detalles del servicio..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" /> Precio Regular *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                    <input 
                      type="number" 
                      className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                      value={editingService?.price || ''} 
                      onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" /> Precio Promo
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                    <input 
                      type="number" 
                      className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                      value={editingService?.promo_price || ''} 
                      onChange={e => setEditingService({...editingService, promo_price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 border-t border-black-light dark:border-dark-light my-2 pt-6">
                  <h4 className="font-bold text-lg tracking-tight text-black dark:text-white mb-6 flex items-center gap-2">
                    Post-Servicio & Seguimiento
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Días para seguimiento (Whatsapp autom.)
                      </label>
                      <input 
                        type="number" 
                        className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                        value={editingService?.duration_days || 0} 
                        onChange={e => setEditingService({...editingService, duration_days: parseInt(e.target.value)})}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-primary" /> Instrucciones de Cuidado
                      </label>
                      <textarea 
                        className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                        value={editingService?.care_instructions || ''} 
                        onChange={e => setEditingService({...editingService, care_instructions: e.target.value})}
                        placeholder="Ej: No asolearse por 24 hrs..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-black dark:text-white flex items-center justify-between">
                        <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Imagen de Cuidados</span>
                        {uploadingImage && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                      </label>
                      <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-2xl border border-black-light dark:border-dark-light">
                        {editingService?.care_image_url ? (
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm border border-zinc-200">
                            <img src={editingService.care_image_url} alt="Care" className="w-full h-full object-cover" />
                            <button 
                              className="absolute top-1 right-1 bg-black/60 hover:bg-danger text-white rounded-full p-1 transition-colors backdrop-blur-md"
                              onClick={() => setEditingService({...editingService, care_image_url: ''})}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-primary">
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">Subir</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                          </label>
                        )}
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-[250px]">Sube una imagen o flyer con las instrucciones de cuidado para enviar por WhatsApp.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only" 
                        checked={editingService?.is_active ?? true}
                        onChange={e => setEditingService({...editingService, is_active: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/10 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform dark:border-zinc-600 peer-checked:bg-primary"></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-black dark:text-white group-hover:text-primary transition-colors">Servicio Activo en el Catálogo</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-[280px]">Si lo desactivas, dejará de aparecer como opción al crear nuevas atenciones, pero no perderás tu historial de ventas.</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900/50">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn btn-outline-secondary rounded-xl px-6" 
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition" 
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </span>
                ) : (
                  'Guardar Servicio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
