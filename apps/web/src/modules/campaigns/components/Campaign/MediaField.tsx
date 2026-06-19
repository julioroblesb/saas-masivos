import { crmToast } from '../../../../hooks/useToast';
import { useRef, useState } from 'react';
import { Loader2, Image, Video, Mic, MicOff, FileAudio, CheckCircle2, UploadCloud, FileText } from 'lucide-react';
import { useCampaignAudioRecorder } from '../../../../hooks/media/useCampaignAudioRecorder';
import type { SequenceItem } from './types';

export function MediaField({
  msg,
  onContentReady,
  uploadingIds,
  uploadMedia,
}: {
  msg: SequenceItem;
  onContentReady: (id: string, url: string, filename: string) => void;
  uploadingIds: Set<string>;
  uploadMedia: (id: string, file: File | Blob, name: string) => Promise<string | null>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorder = useCampaignAudioRecorder();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const isUploading = uploadingIds.has(msg.id);
  const accept = msg.type === 'image' ? 'image/*'
    : msg.type === 'video' ? 'video/*'
    : msg.type === 'audio' ? 'audio/*'
    : '.pdf,application/pdf';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadMedia(msg.id, file, file.name);
    if (url) onContentReady(msg.id, url, file.name);
  };

  const handleStopRecord = async () => {
    const blob = await recorder.stop();
    if (!blob) { crmToast.error('Grabación demasiado corta.'); return; }
    setAudioBlob(blob);
  };

  const handleUploadAudio = async () => {
    if (!audioBlob) return;
    const filename = `audio_${Date.now()}.webm`;
    const url = await uploadMedia(msg.id, audioBlob, filename);
    if (url) { onContentReady(msg.id, url, filename); setAudioBlob(null); }
  };

  if (msg.type === 'audio') {
    if (msg.content && msg.uploadedFilename) {
      return (
        <div className="media-ready-pill">
          <FileAudio size={15} style={{ color: '#7c3aed', flexShrink: 0 }} />
          <span className="pill-name">{msg.uploadedFilename}</span>
          <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
          <button className="media-change-btn" onClick={() => { /* could reset */ }}>✓ Listo</button>
        </div>
      );
    }
    if (audioBlob) {
      return (
        <div className="audio-preview-row">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <div className="audio-preview-actions">
            <button className="btn-use-audio" onClick={handleUploadAudio} disabled={isUploading}>
              {isUploading ? <><Loader2 size={14} className="spin" /> Subiendo...</> : <><UploadCloud size={14} /> Usar este audio</>}
            </button>
            <button className="btn-discard" onClick={() => { recorder.cancel(); setAudioBlob(null); }}>Descartar</button>
          </div>
        </div>
      );
    }
    if (recorder.isRecording) {
      return (
        <div className="recording-box">
          <div className="recording-indicator">
            <span className="recording-dot" />
            Grabando... {recorder.seconds}s
          </div>
          <button className="btn-stop-record" onClick={handleStopRecord}>
            <MicOff size={14} /> Detener
          </button>
        </div>
      );
    }
    return (
      <button className="btn-start-record" onClick={() => recorder.start()}>
        <Mic size={16} /> Iniciar Grabación de Audio
      </button>
    );
  }

  if (msg.content && msg.uploadedFilename) {
    return (
      <div className="media-ready-pill">
        {msg.type === 'image' ? <Image size={15} style={{ color: '#0ea5e9', flexShrink: 0 }} />
          : msg.type === 'document' ? <FileText size={15} style={{ color: '#e11d48', flexShrink: 0 }} />
          : <Video size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />}
        <span className="pill-name">{msg.uploadedFilename}</span>
        <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
        <button className="media-change-btn" onClick={() => fileInputRef.current?.click()}>Cambiar</button>
        <input ref={fileInputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div>
      <div className="media-upload-zone" onClick={() => fileInputRef.current?.click()}>
        {isUploading
          ? <><Loader2 size={22} className="spin" style={{ opacity: 0.6 }} /><span>Subiendo archivo...</span></>
          : msg.type === 'image'
            ? <><Image size={22} className="zone-icon" /><span>Haz clic para seleccionar una imagen</span><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG, JPG, WEBP</span></>
            : msg.type === 'document'
            ? <><FileText size={22} className="zone-icon" style={{ color: '#e11d48' }} /><span>Haz clic para seleccionar un PDF</span><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Solo archivos .PDF (máx. 100MB)</span></>
            : <><Video size={22} className="zone-icon" /><span>Haz clic para seleccionar un video</span><span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>MP4, MOV (máx. 16MB)</span></>}
      </div>
      <input ref={fileInputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  );
}
