import { useState } from 'react';

export function useCampaignMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  const uploadMedia = async (id: string, file: File | Blob, name: string): Promise<string | null> => {
    setIsUploading(true);
    if (id) {
      setUploadingIds(prev => new Set(prev).add(id));
    }
    try {
      // Mock upload. In a real app, upload to Supabase Storage and return public URL.
      await new Promise(resolve => setTimeout(resolve, 1000));
      return URL.createObjectURL(file); // Temporary local URL
    } finally {
      setIsUploading(false);
      if (id) {
        setUploadingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const isUploadingAny = isUploading || uploadingIds.size > 0;

  return { uploadMedia, isUploading, uploadingIds, isUploadingAny };
}
