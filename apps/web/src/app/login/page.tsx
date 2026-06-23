'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Lock, Mail, Loader2, LogIn } from 'lucide-react';
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
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0A0A0A] p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-zinc-200 dark:border-[#27272A] p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center bg-primary/10 rounded-[16px] shadow-[0_4px_14px_0_rgba(225,29,72,0.1)] text-primary font-bold text-2xl">
            LR
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight" style={{fontFamily: 'var(--font-head)'}}>Acceso al Sistema</h2>
          <p className="text-zinc-500 dark:text-gray-400 text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-zinc-300 dark:border-[#27272A] rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="usuario@ejemplo.com"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-gray-300 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] dark:bg-[#0A0A0A] border border-zinc-300 dark:border-[#27272A] rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full flex items-center justify-center gap-2 py-3 mt-2 btn btn-primary ${
              (loading || !email || !password) ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Verificando...</>
            ) : (
              <>Iniciar Sesión <LogIn size={18} /></>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-gray-500 font-medium tracking-wider flex flex-col gap-2">
          <span className="uppercase">Protegido por cifrado SSL/TLS</span>
          <Link href="/terminos" className="text-primary hover:text-primary/80 transition-colors">
            Términos y Condiciones
          </Link>
        </div>
      </div>
    </div>
  );
}
