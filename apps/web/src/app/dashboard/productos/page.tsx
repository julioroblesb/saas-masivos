'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SpaProduct } from '@/types/spa';
import { Plus, Edit2, Trash2, Loader2, Package, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
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
          .eq('companyId', profile.company_id)
          .order('name');
        if (prods) setProducts(prods);
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

      setEditingProduct(prev => prev ? { ...prev, imageUrl: publicUrl } : null);
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
            imageUrl: editingProduct.imageUrl,
            isActive: editingProduct.isActive ?? true,
            updatedAt: new Date().toISOString()
          })
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        toast.success('Producto actualizado');
      } else {
        // Create
        const { error } = await supabase
          .from('spa_products')
          .insert([{
            companyId,
            name: editingProduct.name,
            description: editingProduct.description,
            price: editingProduct.price,
            stock: editingProduct.stock,
            imageUrl: editingProduct.imageUrl,
            isActive: true
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
    setEditingProduct({ isActive: true, stock: 0, price: 0 });
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Inventario de Productos
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
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
            <div key={product.id} className="rounded-3xl bg-white dark:bg-dark p-0 relative overflow-hidden group hover:shadow-lg transition-all duration-300 border border-black-light dark:border-dark-light flex flex-col">
              <div className="h-48 w-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
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
                {!product.isActive && (
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
                    <p className="text-xl font-bold tracking-tight text-primary">${product.price}</p>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex justify-center mb-2">
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-black-light dark:border-dark-light bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center group cursor-pointer hover:border-primary transition-colors">
                {editingProduct?.imageUrl ? (
                  <>
                    <img src={editingProduct.imageUrl} alt="Product" className="w-full h-full object-cover" />
                    <button 
                      className="absolute top-1 right-1 bg-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.preventDefault(); setEditingProduct({...editingProduct, imageUrl: ''}) }}
                    >
                      <XCircle className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-zinc-400" /> : <ImageIcon className="w-6 h-6 text-zinc-400" />}
                    <span className="text-xs text-zinc-500 mt-2 font-medium">Subir Foto</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre del Producto *</label>
              <input 
                type="text" 
                className="form-input w-full" 
                value={editingProduct?.name || ''} 
                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                placeholder="Ej: Crema Hidratante"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea 
                className="form-textarea w-full" 
                value={editingProduct?.description || ''} 
                onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                placeholder="Detalles del producto..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio *</label>
                <input 
                  type="number" 
                  className="form-input w-full" 
                  value={editingProduct?.price || ''} 
                  onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock (Unidades) *</label>
                <input 
                  type="number" 
                  className="form-input w-full" 
                  value={editingProduct?.stock || 0} 
                  onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="isActiveProd" 
                className="form-checkbox" 
                checked={editingProduct?.isActive ?? true}
                onChange={e => setEditingProduct({...editingProduct, isActive: e.target.checked})}
              />
              <label htmlFor="isActiveProd" className="text-sm font-medium mb-0">Producto Activo</label>
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
