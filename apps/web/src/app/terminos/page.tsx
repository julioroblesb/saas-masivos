import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function TerminosPage() {
  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-dark text-black dark:text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-3xl border border-black-light dark:border-dark-light shadow-sm">
        
        <Link href="/login" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-primary dark:hover:text-primary transition-colors mb-8">
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Link>

        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-black-light dark:border-dark-light">
          <div className="text-primary">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark dark:text-white-light mb-1">Términos y Condiciones</h1>
            <p className="text-sm text-zinc-500 dark:text-gray-400">Última actualización: 19 de Junio de 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          
          <section>
            <h2 className="text-base font-bold text-dark dark:text-white-light mb-3">1. Definiciones</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Servicio:</strong> Se refiere a la plataforma SaaS proveída en este sitio web, incluyendo todas sus funcionalidades de envío masivo y gestión de contactos.</li>
              <li><strong>Usuario:</strong> Se refiere a cualquier persona o empresa que registre una cuenta para utilizar el Servicio.</li>
              <li><strong>Plataforma Externa:</strong> Hace referencia a WhatsApp, propiedad de Meta Platforms, Inc.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-dark dark:text-white-light mb-3">2. Descripción del Servicio y Método de Conexión</h2>
            <p className="mb-3">Nuestro Servicio es una herramienta de automatización y gestión de mensajería. Usted reconoce expresamente y acepta que:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>El Servicio utiliza una conexión a través de automatización web (emulación multidispositivo) para vincularse con su cuenta de WhatsApp.</li>
              <li><strong>Este método NO es una API oficial de WhatsApp (Meta).</strong></li>
              <li>El Servicio no está afiliado, asociado, autorizado, respaldado por, ni de ninguna manera conectado oficialmente con WhatsApp, Meta Platforms, Inc., o cualquiera de sus subsidiarias o afiliados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-danger mb-3 flex items-center gap-2">
              <ShieldAlert size={18} />
              3. Riesgos del Servicio y Responsabilidad Exclusiva
            </h2>
            <p className="mb-3">
              Debido a la naturaleza no oficial de la conexión, el uso de este Servicio conlleva riesgos inherentes de los cuales <strong>usted es el único responsable</strong>.
            </p>
            
            <h3 className="font-bold text-dark dark:text-white-light mb-2 mt-5">A. Políticas de SPAM y Bloqueos:</h3>
            <p className="mb-3">WhatsApp cuenta con sistemas automatizados para detectar comportamientos inusuales, envío de SPAM o abuso de sus plataformas. Al utilizar este Servicio para enviar mensajes masivos:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Usted asume el riesgo del 100% de que su cuenta, número telefónico o dispositivo pueda ser temporal o permanentemente bloqueado, suspendido o baneado por WhatsApp.</li>
              <li>Nosotros proporcionamos herramientas de "calentamiento" (warm-up) y retrasos automáticos (delays) orientadas a reducir el riesgo, pero <strong>no garantizamos de ninguna manera la inmunidad contra baneos</strong>.</li>
            </ul>

            <h3 className="font-bold text-dark dark:text-white-light mb-2 mt-5">B. Exención de Responsabilidad:</h3>
            <p className="mb-3">Bajo ninguna circunstancia, ni la empresa creadora de este Servicio, ni sus desarrolladores, ni sus representantes serán responsables por:</p>
            <ul className="list-decimal pl-5 space-y-2">
              <li>El bloqueo, pérdida o suspensión temporal o definitiva de su número de WhatsApp.</li>
              <li>La pérdida de chats, contactos, clientes o ventas derivadas de una suspensión de su número.</li>
              <li>Cualquier daño económico, lucro cesante o consecuencia legal resultante del bloqueo de su línea de comunicación.</li>
            </ul>
            <p className="mt-5 font-semibold text-center uppercase tracking-wide text-xs border-t border-black-light dark:border-dark-light pt-4">
              Si usted no puede permitirse perder el número de teléfono con el que planea hacer envíos masivos, le recomendamos encarecidamente NO utilizar este Servicio con dicho número.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-dark dark:text-white-light mb-3">4. Obligaciones Legales y Privacidad</h2>
            <p className="mb-3">El Usuario es el único responsable del origen de la base de datos de contactos a la que envía mensajes. Usted declara y garantiza que:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Posee el consentimiento explícito (opt-in) de cada destinatario para enviarles comunicaciones comerciales a través de WhatsApp.</li>
              <li>No enviará mensajes no solicitados, acosadores, amenazantes, fraudulentos o ilegales.</li>
              <li>Cumplirá con todas las leyes de privacidad y protección de datos vigentes en su país o región.</li>
            </ul>
            <p className="mt-3">El Servicio actúa únicamente como un conducto tecnológico. Nos reservamos el derecho de suspender o eliminar permanentemente cualquier cuenta de nuestro Servicio si recibimos denuncias de spam extremo o actividades ilícitas, sin derecho a reembolso.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-dark dark:text-white-light mb-3">5. Cambios en la Plataforma Externa (WhatsApp)</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Una actualización de WhatsApp puede causar que el Servicio deje de funcionar de forma temporal o permanente.</li>
              <li>No nos hacemos responsables de las interrupciones prolongadas del Servicio derivadas de actualizaciones de seguridad por parte de Meta Platforms, Inc.</li>
            </ul>
          </section>

          <section className="pt-6 border-t border-black-light dark:border-dark-light">
            <h2 className="text-base font-bold text-dark dark:text-white-light mb-3">6. Renuncia de Garantías y Aceptación</h2>
            <p className="text-xs uppercase tracking-wider mb-3">
              El servicio se proporciona "tal cual" (as-is) y "según disponibilidad". No ofrecemos garantías de ningún tipo, expresas o implícitas, sobre la estabilidad, continuidad o seguridad contra bloqueos en la plataforma externa.
            </p>
            <p className="font-medium">
              Al registrar una cuenta y escanear el código QR para vincular su dispositivo, usted acepta incondicionalmente estos Términos y Condiciones y libera de toda responsabilidad legal, comercial o moral a nuestra plataforma.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
