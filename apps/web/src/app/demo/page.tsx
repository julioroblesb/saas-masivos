'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemoLandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleStartDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Iniciar sesión anónima (crea un usuario efímero)
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario anónimo');
      }

      // 2. Llamar al backend para clonar la plantilla
      const res = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al preparar el entorno demo');
      }

      // 3. Redirigir al dashboard
      router.push('/dashboard/atenciones');
      router.refresh();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 sm:p-8 font-sans selection:bg-[#E11D48]/30">
      <div className="max-w-[440px] w-full bg-[#111111] rounded-[16px] border border-[#27272A] p-8 sm:p-10 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* Subtle decorative glow matching the Rose Pop accent */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#E11D48] rounded-full mix-blend-screen filter blur-[120px] opacity-15 pointer-events-none"></div>
        
        <div className="flex flex-col items-center text-center space-y-8 relative z-10">
          
          <div className="flex flex-col items-center space-y-5">
            <div className="w-14 h-14 bg-[#E11D48]/10 rounded-[12px] flex items-center justify-center border border-[#E11D48]/20 ring-4 ring-[#0A0A0A]">
              <Sparkles className="w-6 h-6 text-[#E11D48]" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-[#FAFAFA] text-balance leading-[1.15]">
                Recupera clientes y multiplica las citas de tu Spa
              </h1>
              <p className="text-[15px] leading-relaxed text-[#A1A1AA] text-balance">
                Experimenta un entorno de prueba interactivo. Deja que el sistema trabaje por ti: agenda citas fácilmente y descubre cómo automatizamos tu seguimiento por WhatsApp en piloto automático para que ningún cliente te olvide.
              </p>
            </div>
          </div>

          {error && (
            <div className="w-full bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-[#F43F5E] p-4 rounded-[8px] text-sm text-left flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
               <div className="mt-0.5 shrink-0 text-[16px]">⚠️</div>
               <div className="font-medium">{error}</div>
            </div>
          )}

          <div className="w-full space-y-5 pt-2">
            <button 
              className="w-full h-[52px] bg-[#E11D48] hover:bg-[#BE123C] active:scale-[0.98] text-[#FAFAFA] text-[15px] font-semibold rounded-[8px] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none shadow-[0_0_20px_rgba(225,29,72,0.15)] hover:shadow-[0_0_25px_rgba(225,29,72,0.25)]"
              onClick={handleStartDemo}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Preparando tu entorno...
                </>
              ) : (
                'Comenzar Demo Interactiva'
              )}
            </button>
            
            <div className="flex items-center justify-center gap-2 text-[13px] text-[#A1A1AA] font-medium">
               <ShieldCheck className="w-4 h-4 text-[#27272A]" />
               <span>Entorno seguro. Se reinicia cada 24 horas.</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
