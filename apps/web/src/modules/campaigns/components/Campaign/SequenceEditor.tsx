import { Settings2, Trash2, Plus } from 'lucide-react';
import type { SequenceItem } from './types';
import { MediaField } from './MediaField';
import { CustomSelect } from '@/components/ui/CustomSelect';

const typeLabel: Record<string, string> = { text: '💬 Texto', image: '🖼 Imagen', video: '🎬 Video', audio: '🎤 Audio', document: '📄 Documento (PDF)' };

export function SequenceEditor({
  sequence,
  handleTypeChange,
  removeMessage,
  updateMessage,
  handleMediaReady,
  uploadingIds,
  uploadMedia,
  addMessage
}: {
  sequence: SequenceItem[];
  handleTypeChange: (id: string, type: SequenceItem['type']) => void;
  removeMessage: (id: string) => void;
  updateMessage: (id: string, patch: Partial<SequenceItem>) => void;
  handleMediaReady: (id: string, url: string, filename: string) => void;
  uploadingIds: Set<string>;
  uploadMedia: (id: string, file: File | Blob, name: string) => Promise<string | null>;
  addMessage: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-bold">
          2
        </div>
        <h3 className="m-0 text-xl font-bold dark:text-white-light">Mensajes</h3>
      </div>
      <div className="flex flex-col gap-12 pl-4 border-l border-slate-200 dark:border-slate-800 ml-3">
        {sequence.map((msg, idx) => (
          <div key={msg.id} className="relative -ml-[21px] flex gap-6 group">
            {/* Timeline Dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2 shadow-[0_0_0_4px_white] dark:shadow-[0_0_0_4px_var(--color-dark)]"></div>
            
            <div className="flex-1 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Mensaje {idx + 1}</span>
                <div className="flex items-center gap-2">
                  <div className="w-48">
                    <CustomSelect
                      isSearchable={false}
                      options={Object.entries(typeLabel).map(([v, l]) => ({ value: v, label: l }))}
                      value={{ value: msg.type, label: typeLabel[msg.type] }}
                      onChange={(option: any) => handleTypeChange(msg.id, option.value as SequenceItem['type'])}
                    />
                  </div>
                  <button type="button" className="text-zinc-400 hover:text-danger transition-colors p-1.5" onClick={() => removeMessage(msg.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {/* Content body */}
              <div>
              {msg.type === 'text' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5 mb-0.5">
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{{saludo}} ' })} className="btn btn-sm btn-outline-primary"><span>👋</span> Saludo Aleatorio</button>
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{name} ' })} className="btn btn-sm btn-outline-primary"><span>👤</span> Nombre Cliente</button>
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{{despedida}} ' })} className="btn btn-sm btn-outline-primary"><span>🤝</span> Despedida</button>
                  </div>
                  <textarea
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors min-h-[80px]"
                    value={msg.content}
                    onChange={e => updateMessage(msg.id, { content: e.target.value })}
                    placeholder="Escribe el mensaje aquí... Usa los botones de arriba para inyectar variables."
                    rows={4}
                  />
                  <small className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">
                    💡 <strong>Tip Anti-Spam:</strong> Usa <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">{`{{saludo}}`}</code> y <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">{`{{despedida}}`}</code> para rotar variaciones automáticamente. 
                    Además, inyectamos una <strong>huella invisible única</strong> por mensaje.
                  </small>
                </div>
              ) : (
                <MediaField
                  msg={msg}
                  onContentReady={handleMediaReady}
                  uploadingIds={uploadingIds}
                  uploadMedia={uploadMedia}
                />
              )}
              </div>
              
              {/* Footer */}
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                <span>Espera después:</span>
                <input
                  type="number"
                  className="w-[65px] border-b border-slate-300 dark:border-slate-700 bg-transparent text-center focus:outline-none focus:border-primary text-sm pb-0.5"
                  min={0}
                  step={500}
                  value={msg.delayAfterMs}
                  onChange={e => updateMessage(msg.id, { delayAfterMs: Number(e.target.value) })}
                />
                <span>ms <span className="opacity-70 text-xs">({(msg.delayAfterMs / 1000).toFixed(1)}s)</span></span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="relative -ml-[21px] flex gap-6">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0 mt-2.5 shadow-[0_0_0_4px_white] dark:shadow-[0_0_0_4px_var(--color-dark)]"></div>
          <button type="button" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors py-1.5 flex items-center gap-1" onClick={addMessage}>
            <Plus size={16} /> Agregar Mensaje
          </button>
        </div>
      </div>
    </div>
  );
}
