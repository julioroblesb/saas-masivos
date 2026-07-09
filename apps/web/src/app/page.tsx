import Link from 'next/link';
import { Calendar, MessageCircle, TrendingUp, CheckCircle, ArrowRight, ShieldCheck, Star, Bot, Sparkles, Zap, LayoutDashboard, Clock } from 'lucide-react';

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
            <Link 
              href="/demo"
              className="inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white transition-all bg-gradient-to-r from-pink-500 to-rose-600 rounded-full hover:shadow-2xl hover:shadow-pink-500/40 hover:-translate-y-1 active:scale-95 w-full sm:w-auto relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              <span className="relative flex items-center gap-2">
                <Sparkles className="w-6 h-6" /> Probar Demo Gratis <ArrowRight className="ml-2 w-6 h-6" />
              </span>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Sin tarjetas de crédito. Prueba interactiva al instante.
          </p>
          
          <div className="mt-20 max-w-5xl mx-auto relative group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950 z-10 h-full w-full pointer-events-none"></div>
            <div className="relative rounded-2xl sm:rounded-t-[2.5rem] overflow-hidden border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-pink-900/10 dark:shadow-pink-900/20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 sm:p-12 transform transition-all duration-700 hover:rotate-0 flex flex-col items-center justify-center min-h-[400px]">
               {/* Aesthetic abstract representation of the dashboard */}
               <div className="w-full flex items-center justify-between mb-8">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                 <div className="h-32 rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 flex flex-col justify-center p-6 items-center text-center group-hover:scale-105 transition-transform duration-500">
                   <Calendar className="w-8 h-8 text-pink-500 mb-3" />
                   <div className="h-3 w-16 bg-pink-500/30 rounded-full mb-2"></div>
                   <div className="h-2 w-24 bg-pink-500/20 rounded-full"></div>
                 </div>
                 <div className="h-32 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex flex-col justify-center p-6 items-center text-center group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                   <MessageCircle className="w-8 h-8 text-emerald-500 mb-3" />
                   <div className="h-3 w-20 bg-emerald-500/30 rounded-full mb-2"></div>
                   <div className="h-2 w-16 bg-emerald-500/20 rounded-full"></div>
                 </div>
                 <div className="h-32 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 flex flex-col justify-center p-6 items-center text-center group-hover:scale-105 transition-transform duration-500">
                   <TrendingUp className="w-8 h-8 text-purple-500 mb-3" />
                   <div className="h-3 w-16 bg-purple-500/30 rounded-full mb-2"></div>
                   <div className="h-2 w-20 bg-purple-500/20 rounded-full"></div>
                 </div>
               </div>
               
               <div className="w-full mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-pink-500/10 blur-2xl rounded-full"></div>
                    <div className="flex gap-4 items-center mb-6">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                      <div className="space-y-2">
                        <div className="h-3 w-24 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="h-2 w-4/5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="h-2 w-3/5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    </div>
                 </div>
                 <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-3 justify-end relative overflow-hidden">
                    <div className="absolute left-0 bottom-0 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full"></div>
                    <div className="w-full flex items-end gap-2 h-full pt-8">
                       <div className="w-1/5 bg-purple-500/20 rounded-t-md h-[40%]"></div>
                       <div className="w-1/5 bg-purple-500/40 rounded-t-md h-[70%]"></div>
                       <div className="w-1/5 bg-pink-500/60 rounded-t-md h-[50%]"></div>
                       <div className="w-1/5 bg-pink-500/80 rounded-t-md h-[90%]"></div>
                       <div className="w-1/5 bg-rose-500 rounded-t-md h-[100%] shadow-[0_0_15px_rgba(244,63,94,0.4)]"></div>
                    </div>
                 </div>
               </div>
               
               <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-slate-950/20 backdrop-blur-[2px]">
                  <Link href="/demo" className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-5 h-5" /> Entrar al Dashboard interactivo
                  </Link>
               </div>
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
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Asignación perfecta por especialista.
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-rose-200/50 dark:bg-rose-900/20 blur-3xl rounded-full transform -skew-y-12"></div>
                <div className="relative rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 h-80 flex flex-col rotate-2 hover:rotate-0 transition-transform duration-500">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-rose-500" />
                         </div>
                         <div>
                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full mb-2"></div>
                            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                         </div>
                      </div>
                      <div className="px-4 py-1.5 bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-sm font-bold rounded-full">
                         Hoy
                      </div>
                   </div>
                   <div className="flex-1 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                      <div className="w-full bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 p-4 rounded-xl flex items-center justify-between">
                         <div className="h-3 w-24 bg-pink-500/40 rounded-full"></div>
                         <div className="h-3 w-12 bg-pink-500/40 rounded-full"></div>
                      </div>
                      <div className="w-3/4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between opacity-60">
                         <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      </div>
                   </div>
                </div>
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
                  ¿Cansado de responder tarifas de un servicio un domingo por la noche? Nuestro bot automatizado responde, enamora y agenda clientes por ti, ordenándolos en un embudo visual para que nunca se te pierda una venta.
                </p>
                <ul className="space-y-4 pt-4">
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Recordatorios automáticos (reduce inasistencias a cero).
                  </li>
                  <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle className="w-6 h-6 text-pink-500 shrink-0" /> Mensajes de seguimiento post-atención para fidelizar.
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-emerald-200/50 dark:bg-emerald-900/20 blur-3xl rounded-full transform skew-y-12"></div>
                <div className="relative rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 h-80 flex gap-4 -rotate-2 hover:rotate-0 transition-transform duration-500">
                   <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 space-y-3">
                      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"></div>
                      <div className="w-full bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                         <div className="h-3 w-3/4 bg-emerald-500/30 rounded-full mb-2"></div>
                         <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="w-full bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                         <div className="h-3 w-full bg-slate-200 dark:bg-slate-600 rounded-full mb-2"></div>
                         <div className="h-2 w-1/3 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
                      </div>
                   </div>
                   <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 space-y-3">
                      <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full mb-4"></div>
                      <div className="w-full bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-emerald-500/30 ring-1 ring-emerald-500/20 relative overflow-hidden">
                         <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
                         <div className="flex items-center gap-2 mb-2">
                           <Bot className="w-4 h-4 text-emerald-500" />
                           <div className="h-3 w-1/2 bg-emerald-500/40 rounded-full"></div>
                         </div>
                         <div className="h-2 w-3/4 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
                      </div>
                   </div>
                </div>
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
                <div className="relative rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 h-80 flex flex-col rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-end justify-between h-32 mb-8 border-b border-slate-200 dark:border-slate-700 pb-2">
                       <div className="w-[12%] bg-purple-500/20 rounded-t-lg h-[30%]"></div>
                       <div className="w-[12%] bg-purple-500/30 rounded-t-lg h-[45%]"></div>
                       <div className="w-[12%] bg-purple-500/50 rounded-t-lg h-[60%] relative group cursor-pointer">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">S/ 450</div>
                       </div>
                       <div className="w-[12%] bg-purple-500/60 rounded-t-lg h-[50%]"></div>
                       <div className="w-[12%] bg-pink-500/80 rounded-t-lg h-[80%]"></div>
                       <div className="w-[12%] bg-gradient-to-t from-rose-600 to-pink-500 rounded-t-lg h-[100%] shadow-[0_0_20px_rgba(244,63,94,0.3)] relative group cursor-pointer">
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-sm font-bold px-3 py-1 rounded shadow-lg">S/ 1200</div>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                          <div className="h-2 w-16 bg-slate-300 dark:bg-slate-600 rounded-full mb-2"></div>
                          <div className="h-5 w-24 bg-slate-800 dark:bg-slate-200 rounded-full"></div>
                       </div>
                       <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                          <div className="h-2 w-20 bg-slate-300 dark:bg-slate-600 rounded-full mb-2"></div>
                          <div className="h-5 w-20 bg-emerald-500/80 rounded-full"></div>
                       </div>
                    </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Pricing / Demo Section */}
      <div id="pricing" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900 dark:bg-slate-950 -z-10"></div>
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-pink-500/20 blur-[150px] rounded-full -z-10 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 flex items-center justify-center gap-4">
              <Zap className="w-10 h-10 text-yellow-400 fill-yellow-400" />
              Experimenta el futuro hoy
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Te invitamos a probar nuestro sistema de forma totalmente gratuita. Si te convence y ahorra tiempo a tu negocio, podrás acceder a nuestro descuento de lanzamiento.
            </p>
          </div>

          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-[2.5rem] blur opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="rounded-[2rem] bg-slate-900 p-8 sm:p-12 shadow-2xl relative border border-slate-800 flex flex-col items-center text-center">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/30 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> 100% Gratuito y Seguro
              </div>
              
              <div className="mb-8 mt-6">
                <h3 className="text-3xl font-bold text-white mb-4">Entorno Demo Interactivo</h3>
                <p className="text-slate-300">
                  Hemos preparado un salón virtual donde podrás agendar citas, ver cómo el bot responde y explorar las analíticas.
                </p>
              </div>

              <div className="w-full bg-slate-800/50 rounded-2xl p-6 mb-10 border border-slate-700/50 text-left">
                 <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                   <Star className="w-4 h-4 text-pink-400" /> Beneficio de Lanzamiento
                 </h4>
                 <p className="text-sm text-slate-400 mb-3">
                   Si el sistema te gusta después de probarlo, mantendremos este precio para ti:
                 </p>
                 <div className="flex items-center gap-3">
                    <span className="text-slate-500 line-through">S/ 150/mes</span>
                    <span className="text-2xl font-bold text-white">S/ 75<span className="text-sm text-slate-400 font-normal">/mes</span></span>
                 </div>
              </div>

              <Link 
                href="/demo"
                className="flex w-full items-center justify-center gap-3 px-8 py-5 text-xl font-bold text-white transition-all bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-1 active:scale-95"
              >
                <LayoutDashboard className="w-6 h-6" /> Probar Demo Ahora
              </Link>
              <p className="text-center text-sm text-slate-500 mt-6 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> La sesión de prueba dura 24 horas.
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
