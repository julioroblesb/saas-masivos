'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Correo de recuperación enviado');
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-zinc-50 dark:bg-dark font-sans">
      
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
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6" style={{ textWrap: 'balance' }}>
              Recupera tu acceso fácilmente.
            </h1>
            <p className="text-white/80 text-lg max-w-md leading-relaxed" style={{ textWrap: 'pretty' }}>
              Te enviaremos un enlace seguro a tu correo electrónico para que puedas configurar una nueva contraseña y volver a tu panel.
            </p>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative bg-white dark:bg-zinc-900">
        <div className="w-full max-w-[400px]">
          
          <Link href="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors mb-8 text-sm font-medium">
            <ArrowLeft size={16} /> Volver al inicio de sesión
          </Link>

          <div className="mb-10 text-center flex flex-col items-center md:hidden">
            <div className="h-12 w-12 mb-4 flex items-center justify-center bg-black rounded-xl text-white font-bold text-xl shadow-lg">
              RC
            </div>
            <h2 className="type-page-title mb-2 text-black dark:text-white">Recuperar contraseña</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Ingresa tu correo para recibir las instrucciones</p>
          </div>

          <div className="hidden md:block mb-10">
            <h2 className="type-page-title mb-2 text-black dark:text-white">Recuperar contraseña</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Ingresa tu correo para recibir las instrucciones</p>
          </div>

          {sent ? (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-400 mb-2">¡Correo enviado!</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-500/80 mb-6">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada (y la carpeta de spam).
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Intentar con otro correo
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
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
              
              <button
                type="submit"
                disabled={loading || !email}
                className={`w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl font-semibold bg-primary text-white transition-all hover:bg-primary/90 active:scale-[0.98] ${
                  (loading || !email) ? 'opacity-70 cursor-not-allowed' : 'shadow-lg shadow-primary/25'
                }`}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                ) : (
                  <>Enviar Enlace de Recuperación</>
                )}
              </button>
            </form>
          )}
          
        </div>
      </div>
    </div>
  );
}
