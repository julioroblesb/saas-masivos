'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SpaService } from '@/types/spa';
import { Plus, Edit2, Trash2, Loader2, Scissors, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
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
          .eq('companyId', profile.company_id)
          .order('name');
        if (srvs) setServices(srvs);
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

      setEditingService(prev => prev ? { ...prev, careImageUrl: publicUrl } : null);
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
            promoPrice: editingService.promoPrice,
            durationDays: editingService.durationDays || 0,
            careInstructions: editingService.careInstructions,
            careImageUrl: editingService.careImageUrl,
            isActive: editingService.isActive ?? true,
            updatedAt: new Date().toISOString()
          })
          .eq('id', editingService.id);
        
        if (error) throw error;
        toast.success('Servicio actualizado');
      } else {
        // Create
        const { error } = await supabase
          .from('spa_services')
          .insert([{
            companyId,
            name: editingService.name,
            description: editingService.description,
            price: editingService.price,
            promoPrice: editingService.promoPrice,
            durationDays: editingService.durationDays || 0,
            careInstructions: editingService.careInstructions,
            careImageUrl: editingService.careImageUrl,
            isActive: true
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
    setEditingService({ isActive: true, durationDays: 0 });
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-white dark:bg-dark border border-black-light dark:border-dark-light text-center py-12">
            <Scissors className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">No tienes servicios registrados.</p>
          </div>
        ) : (
          services.map(service => (
            <div key={service.id} className="rounded-3xl bg-white dark:bg-dark p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border border-black-light dark:border-dark-light">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">{service.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {service.isActive ? (
                      <span className="badge bg-success/10 text-success text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Activo</span>
                    ) : (
                      <span className="badge bg-danger/10 text-danger text-xs flex items-center gap-1"><XCircle className="w-3 h-3"/> Inactivo</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(service)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(service.id)} className="p-1.5 text-danger hover:bg-danger/10 rounded-md">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 h-10">
                {service.description || 'Sin descripción'}
              </p>
              
              <div className="flex items-end justify-between border-t border-black-light dark:border-dark-light pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Precio</p>
                  <p className="text-xl font-bold tracking-tight text-primary">${service.price}</p>
                  {service.promoPrice && <p className="text-xs text-success font-semibold tracking-wide">Promo: ${service.promoPrice}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Duración Cuidados</p>
                  <p className="text-sm font-semibold text-black dark:text-white">{service.durationDays} días</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingService?.id ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Nombre del Servicio *</label>
                <input 
                  type="text" 
                  className="form-input w-full" 
                  value={editingService?.name || ''} 
                  onChange={e => setEditingService({...editingService, name: e.target.value})}
                  placeholder="Ej: Limpieza Facial"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-sm font-medium">Descripción</label>
                <textarea 
                  className="form-textarea w-full" 
                  value={editingService?.description || ''} 
                  onChange={e => setEditingService({...editingService, description: e.target.value})}
                  placeholder="Detalles del servicio..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio Regular *</label>
                <input 
                  type="number" 
                  className="form-input w-full" 
                  value={editingService?.price || ''} 
                  onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio Promo</label>
                <input 
                  type="number" 
                  className="form-input w-full" 
                  value={editingService?.promoPrice || ''} 
                  onChange={e => setEditingService({...editingService, promoPrice: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="border-t border-black-light dark:border-dark-light my-2 pt-4">
              <h4 className="font-semibold text-sm tracking-tight text-black dark:text-white mb-3">Post-Servicio & Seguimiento</h4>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Días para seguimiento (Para Whatsapp automático)</label>
                  <input 
                    type="number" 
                    className="form-input w-full" 
                    value={editingService?.durationDays || 0} 
                    onChange={e => setEditingService({...editingService, durationDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instrucciones de Cuidado</label>
                  <textarea 
                    className="form-textarea w-full" 
                    value={editingService?.careInstructions || ''} 
                    onChange={e => setEditingService({...editingService, careInstructions: e.target.value})}
                    placeholder="Ej: No asolearse por 24 hrs..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    Imagen de Cuidados
                    {uploadingImage && <Loader2 className="w-3 h-3 animate-spin" />}
                  </label>
                  <div className="flex items-center gap-4">
                    {editingService?.careImageUrl ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200">
                        <img src={editingService.careImageUrl} alt="Care" className="w-full h-full object-cover" />
                        <button 
                          className="absolute top-1 right-1 bg-danger text-white rounded-full p-1"
                          onClick={() => setEditingService({...editingService, careImageUrl: ''})}
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-black-light dark:border-dark-light rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <ImageIcon className="w-6 h-6 text-zinc-400" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                    )}
                    <span className="text-xs text-zinc-500">Sube una imagen o flyer con las instrucciones de cuidado para enviar por WhatsApp.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="isActive" 
                className="form-checkbox" 
                checked={editingService?.isActive ?? true}
                onChange={e => setEditingService({...editingService, isActive: e.target.checked})}
              />
              <label htmlFor="isActive" className="text-sm font-medium mb-0">Servicio Activo</label>
            </div>
          </div>

          <DialogFooter>
            <button onClick={() => setIsModalOpen(false)} className="btn btn-outline-danger" disabled={isSaving}>
              Cancelar
            </button>
            <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
