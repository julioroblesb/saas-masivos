'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Loader2, Building2 } from 'lucide-react';

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profile.company_id)
            .single();
            
          if (company) {
            setCompanyName(company.name);
          }
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  const handleSave = async () => {
    if (!companyName.trim()) {
      toast.error('El nombre de la empresa no puede estar vacío');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: companyName.trim() })
        .eq('id', companyId);

      if (error) throw error;
      toast.success('Configuración actualizada');
    } catch (error: any) {
      console.error('Error al guardar:', error);
      toast.error('Error al actualizar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Configuración</h1>
        <p className="text-zinc-500 mt-2">Gestiona la información y ajustes de tu organización.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Perfil de la Empresa</h2>
            <p className="text-sm text-zinc-500">Este nombre será usado para identificar a tu asistente en la plataforma (ej. BuilderBot).</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium text-zinc-700">Nombre de la Empresa</label>
            <Input 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej. Mi Agencia LLC"
              className="w-full"
            />
          </div>

          <div className="pt-4 flex items-center">
            <Button onClick={handleSave} disabled={isSaving || !companyName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
