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
  const [settings, setSettings] = useState<{ greetings: string, farewells: string }>({ greetings: '', farewells: '' });
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
            .select('name, settings')
            .eq('id', profile.company_id)
            .single();
            
          if (company) {
            setCompanyName(company.name);
            if (company.settings) {
              setSettings({
                greetings: company.settings.greetings?.join('\n') || '',
                farewells: company.settings.farewells?.join('\n') || '',
              });
            }
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
      const formattedSettings = {
        greetings: settings.greetings.split('\n').map(s => s.trim()).filter(s => s),
        farewells: settings.farewells.split('\n').map(s => s.trim()).filter(s => s)
      };

      const res = await fetch('/api/settings/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          companyName: companyName.trim(), 
          companyId,
          settings: formattedSettings
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error desconocido');
      }

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

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden mb-6">
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center space-x-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Variables Aleatorias (Spintax)</h2>
            <p className="text-sm text-zinc-500">Define una lista de opciones para usar en tus campañas masivas. Ingresa una opción por línea.</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Opciones para Saludo Aleatorio <code className="bg-slate-100 px-1 rounded text-xs ml-1 text-purple-600">{'{{saludo}}'}</code></label>
              <textarea 
                value={settings.greetings}
                onChange={(e) => setSettings({ ...settings, greetings: e.target.value })}
                placeholder="Hola&#10;Buen día&#10;Qué tal"
                className="w-full min-h-[120px] p-3 border border-zinc-200 rounded-lg text-sm resize-y outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-zinc-500">Ejemplo: Escribe "Hola", dale a Enter, escribe "Buen día".</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Opciones para Despedida <code className="bg-slate-100 px-1 rounded text-xs ml-1 text-purple-600">{'{{despedida}}'}</code></label>
              <textarea 
                value={settings.farewells}
                onChange={(e) => setSettings({ ...settings, farewells: e.target.value })}
                placeholder="Saludos&#10;Gracias&#10;Hasta luego"
                className="w-full min-h-[120px] p-3 border border-zinc-200 rounded-lg text-sm resize-y outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center">
        <Button onClick={handleSave} disabled={isSaving || !companyName.trim()} className="bg-indigo-600 hover:bg-indigo-700 px-8">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Configuración Completa'
          )}
        </Button>
      </div>
    </div>
  );
}
