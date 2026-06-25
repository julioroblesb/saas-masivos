'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemoLandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Opcional: Auto-iniciar al cargar la página si queremos que sea sin fricción
  // useEffect(() => {
  //   handleStartDemo();
  // }, []);

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Prueba Masivos
          </h1>
          <p className="text-slate-500">
            Te hemos preparado un entorno interactivo y seguro para que pruebes el sistema sin compromisos.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full h-14 text-lg rounded-xl shadow-lg"
          onClick={handleStartDemo}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Preparando tu entorno...
            </>
          ) : (
            'Comenzar Demo Interactivo'
          )}
        </Button>

        <p className="text-xs text-slate-400">
          *Tus datos de prueba se borrarán automáticamente en 24 horas.
        </p>
      </div>
    </div>
  );
}
