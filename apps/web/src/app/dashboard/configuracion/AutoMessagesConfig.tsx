'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';
import { Loader2, MessageSquare, Save } from 'lucide-react';
import { AutoMessageSettings } from '@/types/spa';

export function AutoMessagesConfig({ companyId, initialSettings }: { companyId: string, initialSettings: any }) {
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AutoMessageSettings>({
    careEnabled: false,
    careTemplate: '',
    followUpEnabled: false,
    followUpTemplate: '',
    birthdayEnabled: false,
    birthdayTemplate: '',
  });

  useEffect(() => {
    if (initialSettings?.auto_messages) {
      setSettings(initialSettings.auto_messages);
    }
  }, [initialSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current company to preserve other settings
      const { data: company, error: fetchError } = await supabase
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .single();
        
      if (fetchError) throw fetchError;

      const newSettings = {
        ...company.settings,
        auto_messages: settings
      };

      const { error: updateError } = await supabase
        .from('companies')
        .update({ settings: newSettings })
        .eq('id', companyId);

      if (updateError) throw updateError;
      
      toast.success('Configuración de mensajes automáticos actualizada');
    } catch (error: any) {
      console.error('Error saving auto messages:', error);
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="panel mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-success/10 text-success rounded-lg shrink-0">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold dark:text-white-light">Mensajes Automáticos (Spa)</h2>
          <p className="text-sm text-white-dark">Configura los mensajes de cuidados post-servicio y seguimiento que se enviarán automáticamente.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Cuidados Post-Servicio */}
        <div className="border border-white-light dark:border-[#1b2e4b] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-md font-semibold text-slate-800 dark:text-white-light">Cuidados Post-Servicio</h3>
              <p className="text-xs text-slate-500 mt-1">Se enviará el día del servicio al marcarlo como completado. <br/> Variables disponibles: <code className="text-primary text-xs">{'{{nombre}}'}, {'{{servicio}}'}</code></p>
            </div>
            <Switch
              checked={settings.careEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, careEnabled: checked })}
            />
          </div>
          
          {settings.careEnabled && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block dark:text-white-light">Plantilla del Mensaje</label>
              <textarea
                value={settings.careTemplate}
                onChange={(e) => setSettings({ ...settings, careTemplate: e.target.value })}
                placeholder="Hola {{nombre}}, gracias por visitarnos hoy. Para tu tratamiento de {{servicio}} recuerda seguir estas instrucciones..."
                className="form-textarea w-full min-h-[120px]"
              />
            </div>
          )}
        </div>

        {/* Seguimiento */}
        <div className="border border-white-light dark:border-[#1b2e4b] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-md font-semibold text-slate-800 dark:text-white-light">Mensaje de Seguimiento</h3>
              <p className="text-xs text-slate-500 mt-1">Se enviará en los días configurados del servicio. <br/> Variables disponibles: <code className="text-primary text-xs">{'{{nombre}}'}, {'{{servicio}}'}, {'{{dias}}'}</code></p>
            </div>
            <Switch
              checked={settings.followUpEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, followUpEnabled: checked })}
            />
          </div>
          
          {settings.followUpEnabled && (
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block dark:text-white-light">Plantilla del Mensaje</label>
              <textarea
                value={settings.followUpTemplate}
                onChange={(e) => setSettings({ ...settings, followUpTemplate: e.target.value })}
                placeholder="Hola {{nombre}}, ¿cómo sigues después de tu {{servicio}} hace {{dias}} días?"
                className="form-textarea w-full min-h-[120px]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Guardar Mensajes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
