import Link from 'next/link';
import { Calendar, MessageCircle, Users, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary/20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
                R
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Renova
              </span>
            </div>
            <div>
              <Link 
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all bg-slate-900 dark:bg-white dark:text-slate-900 rounded-full hover:scale-105 active:scale-95 shadow-sm"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-slate-50 to-slate-50 dark:from-primary/20 dark:via-slate-950 dark:to-slate-950"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium text-sm mb-8 ring-1 ring-inset ring-blue-500/20 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Oferta Especial de Lanzamiento por Julio
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8">
            El fin del caos en tu <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
              clínica o negocio
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed">
            Elimina las citas empalmadas, automatiza la comunicación por WhatsApp y ten el control total de tu personal y clientes en un solo sistema inteligente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all bg-primary rounded-full hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto"
            >
              Comenzar Ahora <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a 
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-700 dark:text-slate-200 transition-all bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto shadow-sm"
            >
              Ver Planes
            </a>
          </div>
        </div>
      </div>

      {/* Pain Points / Features Section */}
      <div className="py-24 bg-white dark:bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Solucionamos los dolores de tu día a día
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Diseñado específicamente para negocios que pierden tiempo y dinero por procesos manuales y desordenados.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">¿Citas cruzadas o empalmadas?</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Se acabaron los clientes enojados porque dos personas reservaron a la misma hora con el mismo especialista.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" /> Agenda inteligente anti-choques
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" /> Disponibilidad en tiempo real
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">¿WhatsApp es un caos?</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Deja de perder mensajes importantes o agendar manualmente. Tu comunicación ahora será impecable.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" /> Recordatorios automatizados
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" /> CRM integrado y embudos (Kanban)
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-primary/50 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">¿Falta de control del personal?</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Mide quién genera más ingresos, gestiona los horarios de tu equipo y lleva el control exacto de cada especialista.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" /> Rendimiento y métricas por staff
                </li>
                <li className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" /> Asignación de citas por trabajador
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900 dark:bg-slate-950 -z-10"></div>
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-primary/20 blur-[120px] rounded-full -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Un precio justo, sin sorpresas
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Todo lo que necesitas para escalar tu negocio en una sola cuota mensual.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-2xl relative border border-slate-200 dark:border-slate-800">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-rose-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide shadow-lg">
                🎉 Promoción Lanzamiento Julio
              </div>
              
              <div className="text-center mb-8 mt-4">
                <p className="text-slate-500 dark:text-slate-400 line-through text-lg mb-2 font-medium">Normal: S/ 300</p>
                <div className="flex justify-center items-end gap-1 mb-2">
                  <span className="text-5xl font-extrabold text-slate-900 dark:text-white">S/ 150</span>
                  <span className="text-slate-500 font-medium mb-1">/mes</span>
                </div>
                <p className="text-primary font-bold bg-primary/10 inline-block px-3 py-1 rounded-full text-sm mt-2">
                  ¡50% de descuento aplicado!
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {[
                  'Agenda anti-choques ilimitada',
                  'CRM y gestión de clientes',
                  'Automatización de WhatsApp',
                  'Gestión de personal y métricas',
                  'Dashboard financiero',
                  'Soporte técnico prioritario'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/login"
                className="flex w-full items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all bg-gradient-to-r from-primary to-blue-600 rounded-2xl hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95"
              >
                Obtener Renova Ahora
              </Link>
              <p className="text-center text-sm text-slate-500 mt-4 flex items-center justify-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Cancela en cualquier momento
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-bold text-xs">
              R
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Renova
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Renova. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
