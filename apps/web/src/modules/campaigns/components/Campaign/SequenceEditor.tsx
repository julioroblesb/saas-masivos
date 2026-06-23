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
    <div className="mt-1">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 size={16} className="text-primary" />
        <h3 className="m-0 text-lg font-semibold dark:text-white-light">Secuencia de Mensajes ({sequence.length})</h3>
      </div>
      <div className="flex flex-col gap-5">
        {sequence.map((msg, idx) => (
          <div key={msg.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-[border-color,box-shadow,background-color] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mensaje {idx + 1}</span>
              <div className="flex items-center gap-2">
                <div className="w-48">
                  <CustomSelect
                    isSearchable={false}
                    options={Object.entries(typeLabel).map(([v, l]) => ({ value: v, label: l }))}
                    value={{ value: msg.type, label: typeLabel[msg.type] }}
                    onChange={(option: any) => handleTypeChange(msg.id, option.value as SequenceItem['type'])}
                  />
                </div>
                <button type="button" className="w-7 h-7 rounded-md border-none bg-danger/10 text-danger flex items-center justify-center cursor-pointer transition-colors hover:bg-danger/20" onClick={() => removeMessage(msg.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="p-4">
              {msg.type === 'text' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5 mb-0.5">
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{{saludo}} ' })} className="btn btn-sm btn-outline-primary"><span>👋</span> Saludo Aleatorio</button>
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{name} ' })} className="btn btn-sm btn-outline-primary"><span>👤</span> Nombre Cliente</button>
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{{despedida}} ' })} className="btn btn-sm btn-outline-primary"><span>🤝</span> Despedida</button>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors min-h-[80px]"
                    value={msg.content}
                    onChange={e => updateMessage(msg.id, { content: e.target.value })}
                    placeholder="Escribe el mensaje aquí... Usa los botones de arriba para inyectar variables."
                    rows={4}
                  />
                  <small className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">
                    💡 <strong>Tip Anti-Spam:</strong> Usa <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{saludo}}`}</code> y <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{`{{despedida}}`}</code> para que el sistema rote entre 100 variaciones distintas automáticamente. 
                    Además, inyectamos una <strong>huella invisible única</strong> en código para cada mensaje.
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
            <div className="flex items-center flex-wrap gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Espera después:</span>
              <input
                type="number"
                className="w-[75px] px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                min={0}
                step={500}
                value={msg.delayAfterMs}
                onChange={e => updateMessage(msg.id, { delayAfterMs: Number(e.target.value) })}
              />
              <span className="text-xs text-gray-400 dark:text-gray-500">ms ({(msg.delayAfterMs / 1000).toFixed(1)}s)</span>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-outline-primary w-full border-dashed gap-2" onClick={addMessage}>
          <Plus size={16} /> Agregar Mensaje
        </button>
      </div>
    </div>
  );
}
