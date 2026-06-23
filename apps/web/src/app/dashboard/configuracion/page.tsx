'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Loader2, Building2 } from 'lucide-react';
import { AutoMessagesConfig } from './AutoMessagesConfig';

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [settings, setSettings] = useState<{ greetings: string, farewells: string }>({ greetings: '', farewells: '' });
  const [fullSettingsObj, setFullSettingsObj] = useState<any>({});
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
              setFullSettingsObj(company.settings);
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

      <div className="panel mb-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold dark:text-white-light">Perfil de la Empresa</h2>
            <p className="text-sm text-white-dark">Este nombre será usado para identificar a tu asistente en la plataforma (ej. BuilderBot).</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium dark:text-white-light">Nombre de la Empresa</label>
            <Input 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej. Mi Agencia LLC"
              className="w-full form-input"
            />
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-secondary/10 text-secondary rounded-lg shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold dark:text-white-light">Variables Aleatorias (Spintax)</h2>
            <p className="text-sm text-white-dark">Define una lista de opciones para usar en tus campañas masivas. Ingresa una opción por línea.</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-white-light">Opciones para Saludo Aleatorio <code className="bg-primary/10 px-1 rounded text-xs ml-1 text-primary">{'{{saludo}}'}</code></label>
              <textarea 
                value={settings.greetings}
                onChange={(e) => setSettings({ ...settings, greetings: e.target.value })}
                placeholder="Hola&#10;Buen día&#10;Qué tal"
                className="form-textarea w-full min-h-[120px]"
              />
              <p className="text-xs text-white-dark mt-2">Ejemplo: Escribe "Hola", dale a Enter, escribe "Buen día".</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-white-light">Opciones para Despedida <code className="bg-primary/10 px-1 rounded text-xs ml-1 text-primary">{'{{despedida}}'}</code></label>
              <textarea 
                value={settings.farewells}
                onChange={(e) => setSettings({ ...settings, farewells: e.target.value })}
                placeholder="Saludos&#10;Gracias&#10;Hasta luego"
                className="form-textarea w-full min-h-[120px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end">
        <button 
          onClick={handleSave} 
          disabled={isSaving || !companyName.trim()} 
          className="btn btn-primary gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Cambios'
          )}
        </button>
      </div>

      {companyId && (
        <AutoMessagesConfig companyId={companyId} initialSettings={fullSettingsObj} />
      )}
    </div>
  );
}
