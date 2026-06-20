import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#111827] text-zinc-900 dark:text-gray-100 p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#1f2937] p-8 md:p-12 rounded-2xl shadow-xl border border-zinc-200 dark:border-gray-800">
        
        <Link href="/login" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Link>

        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-200 dark:border-gray-800">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2" style={{fontFamily: 'var(--font-head)'}}>Términos y Condiciones</h1>
            <p className="text-zinc-500 dark:text-gray-400">Última actualización: 19 de Junio de 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-zinc-700 dark:text-gray-300 leading-relaxed text-base lg:text-lg">
          
          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">1. Definiciones</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Servicio:</strong> Se refiere a la plataforma SaaS proveída en este sitio web, incluyendo todas sus funcionalidades de envío masivo y gestión de contactos.</li>
              <li><strong>Usuario:</strong> Se refiere a cualquier persona o empresa que registre una cuenta para utilizar el Servicio.</li>
              <li><strong>Plataforma Externa:</strong> Hace referencia a WhatsApp, propiedad de Meta Platforms, Inc.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">2. Descripción del Servicio y Método de Conexión</h2>
            <p className="mb-4">Nuestro Servicio es una herramienta de automatización y gestión de mensajería. Usted reconoce expresamente y acepta que:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>El Servicio utiliza una conexión a través de automatización web (emulación multidispositivo) para vincularse con su cuenta de WhatsApp.</li>
              <li><strong>Este método NO es una API oficial de WhatsApp (Meta).</strong></li>
              <li>El Servicio no está afiliado, asociado, autorizado, respaldado por, ni de ninguna manera conectado oficialmente con WhatsApp, Meta Platforms, Inc., o cualquiera de sus subsidiarias o afiliados.</li>
            </ul>
          </section>

          <div className="p-6 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl my-8">
            <h2 className="text-xl font-bold text-orange-900 dark:text-orange-400 mb-4 flex items-center gap-2">
              <ShieldAlert size={24} />
              3. Riesgos del Servicio y Responsabilidad Exclusiva
            </h2>
            <p className="mb-4 text-orange-800 dark:text-orange-300">
              Debido a la naturaleza no oficial de la conexión, el uso de este Servicio conlleva riesgos inherentes de los cuales <strong>usted es el único responsable</strong>.
            </p>
            
            <h3 className="font-bold text-orange-900 dark:text-orange-400 mb-2 mt-6">A. Políticas de SPAM y Bloqueos:</h3>
            <p className="mb-4 text-orange-800 dark:text-orange-300">WhatsApp cuenta con sistemas automatizados para detectar comportamientos inusuales, envío de SPAM o abuso de sus plataformas. Al utilizar este Servicio para enviar mensajes masivos:</p>
            <ul className="list-disc pl-5 space-y-2 text-orange-800 dark:text-orange-300">
              <li>Usted asume el riesgo del 100% de que su cuenta, número telefónico o dispositivo pueda ser temporal o permanentemente bloqueado, suspendido o baneado por WhatsApp.</li>
              <li>Nosotros proporcionamos herramientas de "calentamiento" (warm-up) y retrasos automáticos (delays) orientadas a reducir el riesgo, pero <strong>no garantizamos de ninguna manera la inmunidad contra baneos</strong>.</li>
            </ul>

            <h3 className="font-bold text-orange-900 dark:text-orange-400 mb-2 mt-6">B. Exención de Responsabilidad:</h3>
            <p className="mb-4 text-orange-800 dark:text-orange-300">Bajo ninguna circunstancia, ni la empresa creadora de este Servicio, ni sus desarrolladores, ni sus representantes serán responsables por:</p>
            <ul className="list-decimal pl-5 space-y-2 text-orange-800 dark:text-orange-300">
              <li>El bloqueo, pérdida o suspensión temporal o definitiva de su número de WhatsApp.</li>
              <li>La pérdida de chats, contactos, clientes o ventas derivadas de una suspensión de su número.</li>
              <li>Cualquier daño económico, lucro cesante o consecuencia legal resultante del bloqueo de su línea de comunicación.</li>
            </ul>
            <p className="mt-6 font-bold text-orange-900 dark:text-orange-400 text-center uppercase tracking-wide text-sm border-t border-orange-200 dark:border-orange-900/50 pt-4">
              Si usted no puede permitirse perder el número de teléfono con el que planea hacer envíos masivos, le recomendamos encarecidamente NO utilizar este Servicio con dicho número.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">4. Obligaciones Legales y Privacidad</h2>
            <p className="mb-4">El Usuario es el único responsable del origen de la base de datos de contactos a la que envía mensajes. Usted declara y garantiza que:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Posee el consentimiento explícito (opt-in) de cada destinatario para enviarles comunicaciones comerciales a través de WhatsApp.</li>
              <li>No enviará mensajes no solicitados, acosadores, amenazantes, fraudulentos o ilegales.</li>
              <li>Cumplirá con todas las leyes de privacidad y protección de datos vigentes en su país o región.</li>
            </ul>
            <p className="mt-4">El Servicio actúa únicamente como un conducto tecnológico. Nos reservamos el derecho de suspender o eliminar permanentemente cualquier cuenta de nuestro Servicio si recibimos denuncias de spam extremo o actividades ilícitas, sin derecho a reembolso.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">5. Cambios en la Plataforma Externa (WhatsApp)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Una actualización de WhatsApp puede causar que el Servicio deje de funcionar de forma temporal o permanente.</li>
              <li>No nos hacemos responsables de las interrupciones prolongadas del Servicio derivadas de actualizaciones de seguridad por parte de Meta Platforms, Inc.</li>
            </ul>
          </section>

          <section className="bg-zinc-100 dark:bg-gray-800 p-6 rounded-xl text-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">6. Renuncia de Garantías y Aceptación</h2>
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-gray-400 mb-4">
              El servicio se proporciona "tal cual" (as-is) y "según disponibilidad". No ofrecemos garantías de ningún tipo, expresas o implícitas, sobre la estabilidad, continuidad o seguridad contra bloqueos en la plataforma externa.
            </p>
            <p className="font-medium text-zinc-800 dark:text-gray-200">
              Al registrar una cuenta y escanear el código QR para vincular su dispositivo, usted acepta incondicionalmente estos Términos y Condiciones y libera de toda responsabilidad legal, comercial o moral a nuestra plataforma.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
