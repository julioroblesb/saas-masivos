import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MessageCircle, TrendingUp, CheckCircle, ArrowRight, ShieldCheck, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-pink-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-transform">
                R
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent">
                Renova
              </span>
            </div>
            <div>
              <Link 
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2 text-sm font-semibold text-white transition-all bg-slate-900 dark:bg-white dark:text-slate-900 rounded-full hover:scale-105 active:scale-95 shadow-md"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob dark:bg-pink-900 dark:opacity-20"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 dark:bg-rose-900 dark:opacity-20"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 dark:bg-purple-900 dark:opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 font-medium text-sm mb-8 ring-1 ring-inset ring-pink-500/20 shadow-sm animate-fade-in-up">
            <Star className="w-4 h-4 text-pink-500 fill-pink-500" />
            Software Exclusivo para Centros de Belleza y Peluquerías
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-tight">
            Multiplica tus reservas <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
              sin sacrificar tu tiempo libre
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-10 leading-relaxed font-medium">
            El único asistente virtual que tu salón necesita. Deja que el sistema atienda clientes, organice agendas y evite citas cruzadas mientras tú te dedicas a lo que mejor haces: crear belleza.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all bg-gradient-to-r from-pink-500 to-rose-600 rounded-full hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1 active:scale-95 w-full sm:w-auto"
            >
              Transforma tu Salón Hoy <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>
          
          <div className="mt-20 max-w-5xl mx-auto relative group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950 z-10 h-full w-full pointer-events-none"></div>
            <div className="relative rounded-2xl sm:rounded-t-[2.5rem] overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-pink-900/10 dark:shadow-pink-900/20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-2 sm:p-4 transform transition-all duration-700 hover:rotate-0">
               <img 
                 src="/images/calendar-mockup.png" 
                 alt="Renova Beauty Calendar Dashboard" 
                 className="rounded-xl sm:rounded-[2rem] w-full h-auto object-cover border border-slate-200 dark:border-slate-800"
               />
            </div>
          </div>
        </div>
      </div>

      {/* Pain Points / Features Section */}
      <div className="py-24 bg-white dark:bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-6">
              ¿Identificas estos problemas en tu salón?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Perder dinero por clientes que no asisten, el estrés de responder WhatsApp a las 10 PM o citas cruzadas son cosa del pasado.
            </p>
          </div>

          <div className="space-y-32">
            {/* Feature 1: Calendar */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center mb-6">
                  <Calendar className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Despídete de los cruces de citas y clientes furiosos
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Imagina la tranquilidad de saber que tu agenda está perfectamente organizada. Nunca más tendrás a dos clientas esperando por el mismo estilista a la misma hora. El sistema acomoda los espacios de forma inteligente.
                </p>
                <ul className="space-y-4 pt-4">
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Visibilidad total de los tiempos muertos.
                  </li>
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Asignación perfecta por especialista (Uñas, cabello, masajes).
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-rose-200/50 dark:bg-rose-900/20 blur-3xl rounded-full transform -skew-y-12"></div>
                <img src="/images/calendar-mockup.png" alt="Agenda Inteligente" className="relative rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 rotate-2 hover:rotate-0 transition-transform duration-500" />
              </div>
            </div>

            {/* Feature 2: WhatsApp CRM */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">
              <div className="flex-1 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-6">
                  <MessageCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Duerme tranquilo, tu WhatsApp sigue vendiendo 24/7
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  ¿Cansado de responder tarifas de Balayage un domingo por la noche? Nuestro bot automatizado responde, enamora y agenda clientes por ti, ordenándolos en un embudo visual para que nunca se te pierda una venta.
                </p>
                <ul className="space-y-4 pt-4">
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Recordatorios automáticos (reduce inasistencias a cero).
                  </li>
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Pipeline de clientes nuevos y fidelizados (Kanban).
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-emerald-200/50 dark:bg-emerald-900/20 blur-3xl rounded-full transform skew-y-12"></div>
                <img src="/images/kanban-mockup.png" alt="CRM WhatsApp Kanban" className="relative rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 -rotate-2 hover:rotate-0 transition-transform duration-500" />
              </div>
            </div>

            {/* Feature 3: Analytics */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center mb-6">
                  <TrendingUp className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Conoce exactamente quién te genera más ganancias
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Toma el control financiero de tu centro estético. Descubre qué servicios son tus minas de oro, evalúa el rendimiento de tu staff y calcula comisiones sin dolores de cabeza de fin de mes.
                </p>
                <ul className="space-y-4 pt-4">
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Gráficos de ingresos diarios y mensuales.
                  </li>
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Control total sobre el desempeño de cada estilista.
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-purple-200/50 dark:bg-purple-900/20 blur-3xl rounded-full transform -skew-y-12"></div>
                <img src="/images/analytics-mockup.png" alt="Dashboard Analíticas" className="relative rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 rotate-2 hover:rotate-0 transition-transform duration-500" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900 dark:bg-slate-950 -z-10"></div>
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-pink-500/20 blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Invierte en tu tranquilidad
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Recuperas esta inversión con tu primer cliente extra del mes gracias a los recordatorios que evitan inasistencias.
            </p>
          </div>

          <div className="max-w-lg mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="rounded-[2rem] bg-slate-900 p-8 sm:p-12 shadow-2xl relative border border-slate-800">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg shadow-pink-500/30">
                Lanzamiento Julio
              </div>
              
              <div className="text-center mb-8 mt-6">
                <p className="text-slate-400 line-through text-xl mb-2 font-medium">Precio Regular: S/ 150</p>
                <div className="flex justify-center items-end gap-1 mb-2">
                  <span className="text-6xl font-extrabold text-white tracking-tight">S/ 75</span>
                  <span className="text-slate-400 font-medium mb-2 text-lg">/mes</span>
                </div>
                <p className="text-pink-400 font-bold bg-pink-500/10 inline-block px-4 py-1.5 rounded-full text-sm mt-3 ring-1 ring-pink-500/20">
                  ¡50% OFF de por vida al inscribirte hoy!
                </p>
              </div>

              <div className="space-y-5 mb-10 mt-10">
                {[
                  'Agenda anti-choques sin límites',
                  'CRM Inteligente en Kanban',
                  'Automatización de WhatsApp 24/7',
                  'Gestión de Estilistas y Staff',
                  'Reportes Financieros Reales',
                  'Soporte Técnico VIP'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-pink-400" />
                    </div>
                    <span className="text-slate-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/login"
                className="flex w-full items-center justify-center px-8 py-5 text-lg font-bold text-white transition-all bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1 active:scale-95"
              >
                Eleva tu Salón Ahora
              </Link>
              <p className="text-center text-sm text-slate-500 mt-6 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Sin contratos forzosos. Cancela cuando quieras.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-950 py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-xs">
                R
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Renova
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              Potenciando el éxito de centros estéticos.
            </p>
          </div>
          
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Renova. Todos los derechos reservados.
          </p>
          
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-500 transition-colors">
              Acceso a Clientes
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
