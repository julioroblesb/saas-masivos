export interface SequenceItem {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content: string;
  mediaUrl?: string;
  delayAfterMs: number;
  previewUrl?: string;
  uploadedFilename?: string;
}
