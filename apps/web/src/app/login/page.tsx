'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="min-h-screen flex items-center justify-center bg-[#f4f4f5] dark:bg-[#111827] p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#1f2937] rounded-xl shadow-xl border border-zinc-200 dark:border-gray-700 p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 mb-4 flex items-center justify-center bg-indigo-500 rounded-full shadow-sm text-white font-bold text-2xl">
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
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-zinc-300 dark:border-gray-600 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
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
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-zinc-300 dark:border-gray-600 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !email || !password}
            className={`w-full flex items-center justify-center gap-2 py-3 mt-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold transition-all shadow-sm ${
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
        
        <div className="mt-8 text-center text-xs text-zinc-400 dark:text-gray-500 font-medium uppercase tracking-wider">
          Protegido por cifrado SSL/TLS
        </div>
      </div>
    </div>
  );
}
