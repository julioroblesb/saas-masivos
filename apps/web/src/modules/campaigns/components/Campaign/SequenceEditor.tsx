import { Settings2, Trash2, Plus } from 'lucide-react';
import type { SequenceItem } from './types';
import { MediaField } from './MediaField';
import Card from '@/components/legacy/Card';

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
    <Card className="overflow-hidden mt-1">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <Settings2 size={16} className="text-purple-600 dark:text-purple-400" />
        <h3 className="m-0 text-[0.95rem] font-bold text-slate-900 dark:text-white">Secuencia de Mensajes ({sequence.length})</h3>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {sequence.map((msg, idx) => (
          <div key={msg.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden transition-all focus-within:border-blue-300 dark:focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mensaje {idx + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-md text-[0.8rem] font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 cursor-pointer outline-none focus:border-blue-500"
                  value={msg.type}
                  onChange={e => handleTypeChange(msg.id, e.target.value as SequenceItem['type'])}
                >
                  {Object.entries(typeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="w-7 h-7 rounded-md border-none bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center cursor-pointer transition-colors hover:bg-rose-200 dark:hover:bg-rose-900/50" onClick={() => removeMessage(msg.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="p-4">
              {msg.type === 'text' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5 mb-0.5">
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{{saludo}} ' })} className="text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600"><span>👋</span> Saludo Aleatorio</button>
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{name} ' })} className="text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600"><span>👤</span> Nombre Cliente</button>
                    <button type="button" onClick={() => updateMessage(msg.id, { content: msg.content + '{{despedida}} ' })} className="text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-600"><span>🤝</span> Despedida</button>
                  </div>
                  <textarea
                    className="w-full min-h-[80px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-[0.9rem] resize-y outline-none transition-all box-border font-sans leading-relaxed text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={msg.content}
                    onChange={e => updateMessage(msg.id, { content: e.target.value })}
                    placeholder="Escribe el mensaje aquí... Usa los botones de arriba para inyectar variables."
                    rows={4}
                  />
                  <small className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                    💡 <strong>Tip Anti-Spam:</strong> Usa <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{`{{saludo}}`}</code> y <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{`{{despedida}}`}</code> para que el sistema rote entre 100 variaciones distintas automáticamente. 
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
              <span className="text-[0.73rem] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Espera después:</span>
              <input
                type="number"
                className="w-[75px] px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-md text-[0.82rem] text-center outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-blue-500"
                min={0}
                step={500}
                value={msg.delayAfterMs}
                onChange={e => updateMessage(msg.id, { delayAfterMs: Number(e.target.value) })}
              />
              <span className="text-[0.7rem] text-slate-400 dark:text-slate-500">ms ({(msg.delayAfterMs / 1000).toFixed(1)}s)</span>
            </div>
          </div>
        ))}
        <button className="w-full p-3 border-2 border-dashed border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-[0.88rem] cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-400" onClick={addMessage}>
          <Plus size={16} /> Agregar Mensaje
        </button>
      </div>
    </Card>
  );
}
