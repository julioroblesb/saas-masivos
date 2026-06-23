'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SpaProduct } from '@/types/spa';
import { Plus, Edit2, Trash2, Loader2, Package, Image as ImageIcon, CheckCircle, XCircle, Tag, FileText, Coins, Box } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function SpaProductsPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<SpaProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<SpaProduct> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        const { data: prods } = await supabase
          .from('spa_products')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('name');
        if (prods) {
          setProducts(prods);
        }
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
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

      setEditingProduct(prev => prev ? { ...prev, image_url: publicUrl } : null);
      toast.success('Imagen subida correctamente');
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      toast.error('Error al subir imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!editingProduct?.name || editingProduct?.price === undefined || editingProduct?.stock === undefined) {
      toast.error('Nombre, precio y stock son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProduct.id) {
        // Update
        const { error } = await supabase
          .from('spa_products')
          .update({
            name: editingProduct.name,
            description: editingProduct.description,
            price: editingProduct.price,
            stock: editingProduct.stock,
            image_url: editingProduct.image_url,
            is_active: editingProduct.is_active ?? true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        toast.success('Producto actualizado');
      } else {
        // Create
        const { error } = await supabase
          .from('spa_products')
          .insert([{
            company_id: companyId,
            name: editingProduct.name,
            description: editingProduct.description,
            price: editingProduct.price,
            stock: editingProduct.stock,
            image_url: editingProduct.image_url,
            is_active: true
          }]);
          
        if (error) throw error;
        toast.success('Producto creado');
      }
      
      setIsModalOpen(false);
      loadProducts();
    } catch (error: any) {
      toast.error('Error guardando producto: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      const { error } = await supabase.from('spa_products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Producto eliminado');
      loadProducts();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const openNew = () => {
    setEditingProduct({ is_active: true, stock: 0, price: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (product: SpaProduct) => {
    setEditingProduct(product);
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
            <Package className="w-8 h-8 text-primary" /> Inventario de Productos
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-2">
            Administra tu inventario, precios y existencias de productos de cabina o retail.
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full rounded-3xl bg-white dark:bg-dark border border-black-light dark:border-dark-light text-center py-12">
            <Package className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">No tienes productos registrados.</p>
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} className="rounded-3xl bg-white dark:bg-dark p-0 relative overflow-hidden group hover:shadow-lg transition-[transform,box-shadow,background-color] duration-300 border border-black-light dark:border-dark-light flex flex-col">
              <div className="h-48 w-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(product)} className="p-1.5 bg-white text-primary rounded-md shadow hover:bg-zinc-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="p-1.5 bg-white text-danger rounded-md shadow hover:bg-zinc-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {!product.is_active && (
                  <div className="absolute top-2 left-2 badge bg-danger/90 text-white text-xs">
                    Inactivo
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold tracking-tight text-black dark:text-white mb-2">{product.name}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">
                  {product.description || 'Sin descripción'}
                </p>
                
                <div className="flex items-center justify-between border-t border-black-light dark:border-dark-light pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Precio</p>
                    <p className="text-xl font-bold tracking-tight text-primary">S/ {product.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Stock</p>
                    <p className={`text-sm font-bold tracking-tight ${product.stock <= 5 ? 'text-danger' : 'text-success'}`}>
                      {product.stock} un.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-y-auto">
          <div className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] my-auto">
            <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light">
              <h3 className="text-2xl font-semibold tracking-tight text-black dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {editingProduct?.id ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                </div>
                {editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full" 
                onClick={() => setIsModalOpen(false)}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group-hover:border-primary/50">
                    {editingProduct?.image_url ? (
                      <>
                        <img src={editingProduct.image_url} alt="Producto" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                          <label className="cursor-pointer text-white flex flex-col items-center gap-1">
                            {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                            <span className="text-[10px] font-medium uppercase tracking-wider">Cambiar</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center text-zinc-400 hover:text-primary transition-colors">
                        {uploadingImage ? <Loader2 className="w-6 h-6 mb-2 animate-spin" /> : <ImageIcon className="w-8 h-8 mb-2" />}
                        <span className="text-[11px] font-medium uppercase tracking-wider">Subir Foto</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" /> Nombre del Producto *
                  </label>
                  <input 
                    type="text" 
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                    value={editingProduct?.name || ''} 
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                    placeholder="Ej: Crema Hidratante"
                  />
                </div>
                
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Descripción
                  </label>
                  <textarea 
                    className="form-textarea w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                    value={editingProduct?.description || ''} 
                    onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                    placeholder="Detalles del producto..."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" /> Precio *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">S/</span>
                    <input 
                      type="number" 
                      className="form-input pl-8 w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                      value={editingProduct?.price || ''} 
                      onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-black dark:text-white flex items-center gap-2">
                    <Box className="w-4 h-4 text-primary" /> Stock (Unidades) *
                  </label>
                  <input 
                    type="number" 
                    className="form-input w-full rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-white dark:bg-dark" 
                    value={editingProduct?.stock || 0} 
                    onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})}
                  />
                </div>

                <div className="col-span-1 md:col-span-2 pt-4 border-t border-black-light dark:border-dark-light my-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only" 
                        checked={editingProduct?.is_active ?? true}
                        onChange={e => setEditingProduct({...editingProduct, is_active: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/10 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform dark:border-zinc-600 peer-checked:bg-primary"></div>
                    </div>
                    <span className="text-sm font-semibold text-black dark:text-white group-hover:text-primary transition-colors">Producto Activo (Visible)</span>
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
                  'Guardar Producto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
