'use client';
import { useState } from 'react';
import { Bot, Save, AlertTriangle, PhoneCall } from 'lucide-react';
import Swal from 'sweetalert2';

export function BotConfig() {
  const [prompt, setPrompt] = useState('Eres el asistente virtual de nuestra empresa. Responde de manera amable y corta.');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simular guardado de configuración
    setTimeout(() => {
      setSaving(false);
      Swal.fire({
        icon: 'success',
        title: '¡Configuración Guardada!',
        text: 'El Bot de IA se ha actualizado correctamente en tu instancia.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        customClass: { popup: 'color-success' },
      });
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Disclaimer / Aviso */}
      <div className="panel border-l-4 border-info">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-info/10 text-info rounded-full shrink-0">
            <Bot size={24} />
          </div>
          <div>
            <h5 className="font-semibold text-lg dark:text-white-light mb-1">Configuración Básica del Bot de IA</h5>
            <p className="text-white-dark text-sm mb-3">
              Aquí puedes establecer el comportamiento base de la Inteligencia Artificial que responderá tus mensajes cuando no estés disponible, impulsado por BuilderBot.
            </p>
            <div className="bg-warning/10 border border-warning/20 rounded-md p-3 text-sm text-warning flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>
                <strong>¿Necesitas un bot avanzado?</strong> Si deseas crear un flujo conversacional complejo (con menús, botones, captura de datos estructurados, o integraciones personalizadas con tu sistema), contamos con desarrollo a medida.
              </span>
              <button className="btn btn-warning btn-sm ml-auto shrink-0 whitespace-nowrap">
                Solicitar a Medida
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h5 className="font-semibold text-lg dark:text-white-light mb-5 flex items-center gap-2">
          Ajustes Principales
        </h5>

        <div className="space-y-5">
          {/* Toggle Activar/Desactivar */}
          <div className="flex items-center justify-between border-b border-[#e0e6ed] dark:border-[#1b2e4b] pb-4">
            <div>
              <h6 className="font-semibold text-base dark:text-white-light">Activar Auto-Respuestas IA</h6>
              <p className="text-sm text-white-dark">Si lo apagas, ningún mensaje entrante será respondido automáticamente por la IA.</p>
            </div>
            <label className="w-12 h-6 relative">
              <input 
                type="checkbox" 
                className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" 
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="outline_checkbox bg-icon border-2 border-[#ebedf2] dark:border-white-dark block h-full rounded-full before:absolute before:left-1 before:bg-[#ebedf2] dark:before:bg-white-dark before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary peer-checked:border-primary peer-checked:before:bg-white transition-all duration-300"></span>
            </label>
          </div>

          {/* Prompt de IA */}
          <div className={!enabled ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
            <label className="flex items-center justify-between mb-2">
              <span className="font-semibold text-dark dark:text-white-light">Prompt / Personalidad del Bot</span>
              <span className="text-xs text-white-dark">Max 500 caracteres</span>
            </label>
            <textarea
              className="form-textarea w-full h-32"
              placeholder="Ej: Eres el asistente virtual de la clínica dental Sonrisas. Tu objetivo es agendar citas..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={500}
            ></textarea>
            <p className="text-xs text-white-dark mt-2">
              Esta instrucción será la base del conocimiento de la IA. Sé claro y directo con lo que esperas que responda.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="button" 
              className="btn btn-primary gap-2" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <span className="animate-spin inline-block border-2 border-white border-l-transparent rounded-full w-4 h-4 mr-2"></span> : <Save size={18} />}
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
