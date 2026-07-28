'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, MessageCircle, ShieldCheck, Sparkles, User } from 'lucide-react';
import { normalizePeruPhone } from '@/shared/utils/phone';
import { createClient } from '@/utils/supabase/client';

interface DemoForm {
  businessName: string;
  contactName: string;
  phone: string;
  industry: string;
  whatsappConsent: boolean;
}

const EMPTY_FORM: DemoForm = {
  businessName: '',
  contactName: '',
  phone: '',
  industry: '',
  whatsappConsent: false,
};

export default function DemoLandingPage() {
  const [form, setForm] = useState<DemoForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const updateField = <K extends keyof DemoForm>(field: K, value: DemoForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedPhone = normalizePeruPhone(form.phone);
    if (!normalizedPhone) {
      setError('Ingresa un celular peruano de 9 dígitos, por ejemplo 996 552 871.');
      return;
    }
    if (!form.whatsappConsent) {
      setError('Autoriza el mensaje de demostración para continuar.');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser && !currentUser.is_anonymous) {
        throw new Error(
          'Ya tienes una sesión real abierta. Cierra sesión o abre la demo en una ventana privada.',
        );
      }

      if (!currentUser) {
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear la sesión temporal.');
      }

      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: normalizedPhone,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'No se pudo preparar el entorno demo.');
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : 'No se pudo preparar el entorno demo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-sm font-semibold text-rose-300">
            <Sparkles className="size-4" />
            Demo personalizada
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Conoce Renova CRM con los datos de tu negocio
            </h1>
            <p className="max-w-[60ch] text-base leading-6 text-zinc-400">
              Completa tus datos para crear un entorno privado de demostración. Podrás recorrer
              todas las secciones en modo de solo lectura durante 24 horas.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" />
              <span>No podrás modificar, eliminar ni enviar campañas desde la demo.</span>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
              <span>Recibirás un WhatsApp de prueba personalizado al ingresar.</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:p-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-xl font-semibold text-white">Solicita tu acceso demo</h2>
            <p className="text-sm text-zinc-400">Todos los campos son obligatorios.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-zinc-200">
                <span>Nombre del negocio</span>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="organization"
                    value={form.businessName}
                    onChange={(event) => updateField('businessName', event.target.value)}
                    placeholder="Ej. Studio Valentina"
                    className="form-input w-full rounded-lg border-zinc-700 bg-zinc-950 pl-10 text-white placeholder:text-zinc-600 focus:border-rose-500 focus:ring-rose-500/20"
                  />
                </div>
              </label>

              <label className="space-y-2 text-sm font-medium text-zinc-200">
                <span>Tu nombre</span>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={form.contactName}
                    onChange={(event) => updateField('contactName', event.target.value)}
                    placeholder="Ej. Valentina Ruiz"
                    className="form-input w-full rounded-lg border-zinc-700 bg-zinc-950 pl-10 text-white placeholder:text-zinc-600 focus:border-rose-500 focus:ring-rose-500/20"
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-zinc-200">
                <span>Celular de contacto</span>
                <input
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="996 552 871"
                  className="form-input w-full rounded-lg border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-rose-500 focus:ring-rose-500/20"
                />
                <span className="block text-xs font-normal text-zinc-500">
                  Puedes escribirlo con espacios o guiones. Agregaremos +51 automáticamente.
                </span>
              </label>

              <label className="space-y-2 text-sm font-medium text-zinc-200">
                <span>Rubro</span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.industry}
                  onChange={(event) => updateField('industry', event.target.value)}
                  placeholder="Ej. Manicure y pedicure"
                  className="form-input w-full rounded-lg border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus:border-rose-500 focus:ring-rose-500/20"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <input
                required
                type="checkbox"
                checked={form.whatsappConsent}
                onChange={(event) => updateField('whatsappConsent', event.target.checked)}
                className="mt-0.5 rounded border-zinc-600 bg-zinc-900 text-rose-600 focus:ring-rose-500/30"
              />
              <span className="text-sm leading-5 text-zinc-300">
                Autorizo recibir un único mensaje de WhatsApp para comprobar la automatización
                durante esta demo.
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Preparando tu demo...
                </>
              ) : (
                'Ingresar a mi demo'
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
