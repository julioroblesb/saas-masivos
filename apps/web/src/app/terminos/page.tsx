import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';

export default function TerminosPage() {
  return (
    <main className="min-h-[100dvh] bg-zinc-50 px-4 py-8 font-sans text-black dark:bg-dark dark:text-white sm:px-6 md:py-12">
      <article className="mx-auto max-w-[73ch] rounded-2xl border border-black-light bg-white p-6 dark:border-dark-light dark:bg-zinc-900 sm:p-8 md:p-10">
        <Link
          href="/login"
          className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-zinc-500 transition-colors hover:text-primary dark:hover:text-primary"
        >
          <ArrowLeft size={16} className="mr-2" aria-hidden="true" />
          Volver
        </Link>

        <header className="mb-8 flex items-start gap-4 border-b border-black-light pb-6 dark:border-dark-light">
          <BrandMark size={42} priority />
          <div>
            <h1 className="type-page-title mb-1 text-dark dark:text-white-light">Términos y condiciones</h1>
            <p className="text-sm text-zinc-500 dark:text-gray-400">Última actualización: 28 de julio de 2026</p>
          </div>
        </header>

        <div className="type-body space-y-8 text-zinc-600 dark:text-zinc-400">
          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">1. Alcance del servicio</h2>
            <p>
              Renova CRM es una plataforma de gestión para negocios de servicios. Su función principal
              es centralizar agenda y citas, clientes, atenciones, servicios, equipo, seguimiento y
              cobranza. Las automatizaciones y la mensajería son herramientas complementarias para
              apoyar esa operación.
            </p>
          </section>

          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">2. Cuenta y acceso</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>El usuario debe proporcionar información correcta y mantener sus credenciales protegidas.</li>
              <li>Cada cuenta debe utilizarse únicamente para el negocio y las personas autorizadas por su titular.</li>
              <li>El usuario es responsable de las acciones realizadas desde su cuenta y de informar accesos no autorizados.</li>
            </ul>
          </section>

          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">3. Datos del negocio y de sus clientes</h2>
            <p className="mb-3">
              El usuario conserva la responsabilidad sobre la exactitud, legitimidad y uso de la
              información que registra. Solo debe incorporar datos que pueda tratar legalmente y debe
              respetar las normas de privacidad aplicables.
            </p>
            <p>
              La plataforma no debe utilizarse para almacenar información ilícita, engañosa o ajena a
              la operación autorizada del negocio.
            </p>
          </section>

          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">4. Disponibilidad y mantenimiento</h2>
            <p>
              Trabajamos para mantener el servicio disponible y seguro, pero pueden existir
              interrupciones por mantenimiento, fallos de proveedores o causas fuera de nuestro
              control. Cuando corresponda, podremos actualizar funciones para corregir errores,
              proteger la plataforma o mejorar su funcionamiento.
            </p>
          </section>

          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">5. WhatsApp y mensajería opcional</h2>
            <p className="mb-3">
              La conexión con WhatsApp es una función adicional y no constituye el núcleo de Renova
              CRM. Cuando el usuario decide activarla, reconoce que:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>La conexión actual no es una API oficial de WhatsApp ni implica afiliación con Meta Platforms, Inc.</li>
              <li>Los cambios o restricciones de WhatsApp pueden interrumpir temporal o definitivamente esta función.</li>
              <li>Solo puede enviar comunicaciones a destinatarios con una base legal o consentimiento válido.</li>
              <li>No debe enviar spam, contenido fraudulento, acosador, amenazante o ilegal.</li>
              <li>Las pausas y límites reducen riesgos, pero no garantizan que una cuenta no sea restringida o suspendida.</li>
            </ul>
          </section>

          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">6. Uso aceptable</h2>
            <p className="mb-3">No está permitido utilizar el servicio para:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Acceder, interferir o intentar vulnerar cuentas, datos o infraestructura ajenos.</li>
              <li>Suplantar identidades o registrar información falsa con fines abusivos.</li>
              <li>Automatizar actividades contrarias a la ley o a los derechos de terceros.</li>
              <li>Evitar deliberadamente límites técnicos o medidas de seguridad de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">7. Suspensión y terminación</h2>
            <p>
              Podemos limitar o suspender una cuenta cuando exista un riesgo de seguridad, uso
              ilícito, abuso grave, incumplimiento de estos términos o afectación a terceros. El
              usuario puede dejar de usar el servicio cuando lo decida, sujeto a las condiciones del
              plan contratado.
            </p>
          </section>

          <section className="border-t border-black-light pt-6 dark:border-dark-light">
            <h2 className="type-section-title mb-3 text-dark dark:text-white-light">8. Aceptación</h2>
            <p>
              Al crear una cuenta o continuar utilizando Renova CRM, el usuario confirma que ha leído
              y acepta estos términos. Las condiciones específicas del plan mostradas durante la
              contratación también forman parte del acuerdo de uso.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
