import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { crmToast } from '@/hooks/useToast';

const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(jpeg|png|webp)|video\/(mp4|quicktime)|audio\/|application\/pdf)/;

export function useCampaignMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  const uploadMedia = async (
    id: string,
    file: File | Blob,
    name: string,
  ): Promise<string | null> => {
    if (file.size > MAX_UPLOAD_BYTES) {
      crmToast.error('El archivo supera el límite de 16 MB');
      return null;
    }
    if (file.type && !ALLOWED_TYPES.test(file.type)) {
      crmToast.error('Formato de archivo no permitido');
      return null;
    }

    setIsUploading(true);
    setUploadingIds((current) => new Set(current).add(id));
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error('Sesión no disponible');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (profileError || !profile?.company_id) {
        throw profileError ?? new Error('Empresa no disponible');
      }

      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
      const path = `${profile.company_id}/campaigns/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('spa-media').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type || undefined,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      return supabase.storage.from('spa-media').getPublicUrl(path).data.publicUrl;
    } catch (error: unknown) {
      crmToast.error(error instanceof Error ? error.message : 'No se pudo subir el archivo');
      return null;
    } finally {
      setIsUploading(false);
      setUploadingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  return {
    uploadMedia,
    isUploading,
    uploadingIds,
    isUploadingAny: isUploading || uploadingIds.size > 0,
  };
}
