'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ActualizarPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Verificar si el usuario está autenticado (PKCE auto logs in after click)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Podría ser que no haya venido del enlace o el token expiró
        toast.error('Sesión inválida o enlace expirado. Por favor solicita un nuevo cambio de contraseña.');
        router.push('/recuperar-password');
      }
    };
    
    checkSession();
  }, [router, supabase.auth]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Contraseña actualizada correctamente');
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-zinc-50 dark:bg-dark font-outfit">
      
      {/* Brand Side - Hidden on small screens */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary relative items-center justify-center p-12 overflow-hidden">
        {/* Abstract shapes / Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-white blur-[120px] mix-blend-overlay"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-black blur-[100px] mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 w-full max-w-lg text-white">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white font-bold text-2xl shadow-2xl">
                RC
              </div>
              <div className="text-white font-extrabold text-2xl tracking-widest uppercase">
                Renova CRM
              </div>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]" style={{ textWrap: 'balance' }}>
              Protege tu cuenta.
            </h1>
            <p className="text-white/80 text-lg max-w-md leading-relaxed" style={{ textWrap: 'pretty' }}>
              Crea una nueva contraseña segura para tu cuenta. Asegúrate de no olvidarla esta vez.
            </p>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-zinc-900">
        <div className="w-full max-w-[400px]">
          
          <div className="mb-10 text-center flex flex-col items-center md:hidden">
            <div className="h-12 w-12 mb-4 flex items-center justify-center bg-black rounded-xl text-white font-bold text-xl shadow-lg">
              RC
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white mb-2">Nueva Contraseña</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Ingresa tu nueva contraseña para acceder</p>
          </div>

          <div className="hidden md:block mb-10">
            <h2 className="text-3xl font-bold text-black dark:text-white mb-2 tracking-tight">Nueva Contraseña</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Ingresa tu nueva contraseña para acceder</p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-black dark:text-white">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-dark border border-black-light dark:border-dark-light rounded-xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-black dark:text-white">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-dark border border-black-light dark:border-dark-light rounded-xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className={`w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl font-semibold bg-primary text-white transition-all hover:bg-primary/90 active:scale-[0.98] ${
                (loading || !password || !confirmPassword) ? 'opacity-70 cursor-not-allowed' : 'shadow-lg shadow-primary/25'
              }`}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Actualizando...</>
              ) : (
                <>Actualizar y Entrar</>
              )}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}
