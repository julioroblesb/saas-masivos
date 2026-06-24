'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'react-hot-toast';
import { Loader2, MessageSquare, Save, Plus } from 'lucide-react';
import { AutoMessageSettings } from '@/types/spa';

const DEFAULT_CARE_TEMPLATE = "Hola {{nombre}}, gracias por visitarnos hoy en nuestro local. Esperamos que hayas disfrutado tu servicio de {{servicio}}. ¡Que tengas un excelente día!";
const DEFAULT_CARE_INSTRUCTIONS_TEMPLATE = "Aquí te dejo unos consejos básicos para que tu {{servicio}} te dure más:\n\n{{cuidados}}";
const DEFAULT_FOLLOWUP_TEMPLATE = "Hola {{nombre}}, ¿cómo sigues después de tu servicio de {{servicio}} hace {{dias}} días? Queríamos saber cómo te fue. ¡Saludos!";

export function AutoMessagesConfig({ companyId, initialSettings }: { companyId: string, initialSettings: any }) {
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState<AutoMessageSettings>({
    careEnabled: false,
    careTemplate: '',
    careInstructionsTemplate: '',
    followUpEnabled: false,
    followUpTemplate: '',
    birthdayEnabled: false,
    birthdayTemplate: '',
  });

  const careTextareaRef = useRef<HTMLTextAreaElement>(null);
  const careInstructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const followUpTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialSettings?.auto_messages) {
      setSettings({
        ...initialSettings.auto_messages,
        careTemplate: initialSettings.auto_messages.careTemplate || DEFAULT_CARE_TEMPLATE,
        careInstructionsTemplate: initialSettings.auto_messages.careInstructionsTemplate || DEFAULT_CARE_INSTRUCTIONS_TEMPLATE,
        followUpTemplate: initialSettings.auto_messages.followUpTemplate || DEFAULT_FOLLOWUP_TEMPLATE,
      });
    } else {
      setSettings(prev => ({
        ...prev,
        careTemplate: DEFAULT_CARE_TEMPLATE,
        careInstructionsTemplate: DEFAULT_CARE_INSTRUCTIONS_TEMPLATE,
        followUpTemplate: DEFAULT_FOLLOWUP_TEMPLATE
      }));
    }
  }, [initialSettings]);

  const insertVariable = (
    field: 'careTemplate' | 'careInstructionsTemplate' | 'followUpTemplate',
    variable: string,
    ref: React.RefObject<HTMLTextAreaElement | null>
  ) => {
    const textarea = ref.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = settings[field] || '';
    
    const newText = currentText.substring(0, start) + variable + currentText.substring(end);
    
    setSettings({ ...settings, [field]: newText });
    
    // Focus and restore cursor position after render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Configura los mensajes de agradecimiento y seguimiento que se enviarán automáticamente a tus clientes.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Cuidados Post-Servicio */}
        <div className="border border-black-light dark:border-dark-light rounded-2xl p-6 bg-white dark:bg-dark shadow-sm">
          <div className="flex items-start sm:items-center justify-between mb-4 flex-col sm:flex-row gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">Agradecimiento Post-Servicio</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                Se enviará inmediatamente al marcar la atención como "Completado". 
                Si el servicio tiene instrucciones de cuidado, éstas se enviarán en un mensaje adjunto junto a su imagen.
              </p>
            </div>
            <label className="w-12 h-6 relative">
              <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" 
                checked={settings.careEnabled}
                onChange={(e) => setSettings({ ...settings, careEnabled: e.target.checked })}
              />
              <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
            </label>
          </div>
          
          <div className={`mt-6 transition-all duration-300 ${settings.careEnabled ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
            {/* Mensaje de Agradecimiento */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-black dark:text-white mb-3 block">Plantilla del Mensaje de Agradecimiento</label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => insertVariable('careTemplate', '{{nombre}}', careTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                  <Plus className="w-3 h-3" /> Nombre Cliente
                </button>
                <button onClick={() => insertVariable('careTemplate', '{{servicio}}', careTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                  <Plus className="w-3 h-3" /> Nombre Servicio
                </button>
              </div>

              <textarea
                ref={careTextareaRef}
                value={settings.careTemplate}
                onChange={(e) => setSettings({ ...settings, careTemplate: e.target.value })}
                className="form-textarea w-full min-h-[100px] rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-zinc-50 dark:bg-zinc-900/50 resize-none transition-all"
              />
            </div>

            {/* Mensaje de Cuidados (Adjunto) */}
            <div className="pt-4 border-t border-black-light dark:border-dark-light/50">
              <label className="text-sm font-semibold text-black dark:text-white mb-3 block">Plantilla del Mensaje de Cuidados (Si el servicio tiene cuidados configurados)</label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => insertVariable('careInstructionsTemplate', '{{servicio}}', careInstructionsTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                  <Plus className="w-3 h-3" /> Nombre Servicio
                </button>
                <button onClick={() => insertVariable('careInstructionsTemplate', '{{cuidados}}', careInstructionsTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                  <Plus className="w-3 h-3" /> Cuidados del Servicio
                </button>
              </div>

              <textarea
                ref={careInstructionsTextareaRef}
                value={settings.careInstructionsTemplate || ''}
                onChange={(e) => setSettings({ ...settings, careInstructionsTemplate: e.target.value })}
                className="form-textarea w-full min-h-[100px] rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-zinc-50 dark:bg-zinc-900/50 resize-none transition-all"
                placeholder="Aquí te dejo unos consejos básicos para que tu {{servicio}} te dure más:&#10;&#10;{{cuidados}}"
              />
            </div>
          </div>
        </div>

        {/* Seguimiento */}
        <div className="border border-black-light dark:border-dark-light rounded-2xl p-6 bg-white dark:bg-dark shadow-sm">
          <div className="flex items-start sm:items-center justify-between mb-4 flex-col sm:flex-row gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">Seguimiento Automático</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
                Se enviará de forma programada basándose en la cantidad de "Días para seguimiento" configurada en cada servicio individual.
              </p>
            </div>
            <label className="w-12 h-6 relative">
              <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" 
                checked={settings.followUpEnabled}
                onChange={(e) => setSettings({ ...settings, followUpEnabled: e.target.checked })}
              />
              <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
            </label>
          </div>
          
          <div className={`mt-6 transition-all duration-300 ${settings.followUpEnabled ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
            <label className="text-sm font-semibold text-black dark:text-white mb-3 block">Plantilla del Mensaje de Seguimiento</label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => insertVariable('followUpTemplate', '{{nombre}}', followUpTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                <Plus className="w-3 h-3" /> Nombre Cliente
              </button>
              <button onClick={() => insertVariable('followUpTemplate', '{{servicio}}', followUpTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                <Plus className="w-3 h-3" /> Nombre Servicio
              </button>
              <button onClick={() => insertVariable('followUpTemplate', '{{dias}}', followUpTextareaRef)} className="btn btn-sm btn-outline-primary py-1 px-3 text-xs rounded-full gap-1">
                <Plus className="w-3 h-3" /> Días Transcurridos
              </button>
            </div>

            <textarea
              ref={followUpTextareaRef}
              value={settings.followUpTemplate}
              onChange={(e) => setSettings({ ...settings, followUpTemplate: e.target.value })}
              className="form-textarea w-full min-h-[120px] rounded-xl border-black-light dark:border-dark-light focus:border-primary focus:ring-primary shadow-sm bg-zinc-50 dark:bg-zinc-900/50 resize-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary rounded-xl px-8 shadow-md hover:shadow-lg transition gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" /> Guardar Mensajes Automáticos
            </>
          )}
        </button>
      </div>
    </div>
  );
}
