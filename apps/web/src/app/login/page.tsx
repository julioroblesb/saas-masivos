'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, Loader2, LogIn, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message.includes('Invalid login credentials') ? 'Correo o contraseña incorrectos.' : error.message);
      setLoading(false);
      return;
    }

    toast.success('Inicio de sesión exitoso');
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
            <div className="h-16 w-16 mb-6 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white font-bold text-2xl shadow-2xl">
              LR
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]" style={{ textWrap: 'balance' }}>
              Transforma la gestión de tu negocio hoy.
            </h1>
            <p className="text-white/80 text-lg max-w-md leading-relaxed" style={{ textWrap: 'pretty' }}>
              Centraliza tus citas, mensajes masivos de WhatsApp y pagos en una sola plataforma diseñada para equipos de alto rendimiento.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/90">
              <CheckCircle2 className="text-white/60" size={20} />
              <span>Agenda automatizada e inteligente</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <CheckCircle2 className="text-white/60" size={20} />
              <span>Campañas de marketing por WhatsApp</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <CheckCircle2 className="text-white/60" size={20} />
              <span>Analíticas y flujos de caja en tiempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-zinc-900">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8">
            <div className="h-14 w-14 mb-4 flex items-center justify-center bg-primary/10 rounded-2xl text-primary font-bold text-xl">
              LR
            </div>
            <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Bienvenido</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Ingresa para continuar a tu panel</p>
          </div>

          <div className="hidden md:block mb-10">
            <h2 className="text-3xl font-bold text-black dark:text-white mb-2 tracking-tight">Iniciar Sesión</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Ingresa tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-black dark:text-white">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-50 dark:bg-dark border border-black-light dark:border-dark-light rounded-xl text-black dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
                  placeholder="usuario@ejemplo.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-black dark:text-white">Contraseña</label>
              </div>
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
            
            <button
              type="submit"
              disabled={loading || !email || !password}
              className={`w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl font-semibold bg-primary text-white transition-all hover:bg-primary/90 active:scale-[0.98] ${
                (loading || !email || !password) ? 'opacity-70 cursor-not-allowed' : 'shadow-lg shadow-primary/25'
              }`}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Procesando...</>
              ) : (
                <>Acceder al Panel <LogIn size={18} /></>
              )}
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}
