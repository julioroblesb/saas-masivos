import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { LandingHeader } from './landing-header';
import { ProductWorkspace } from './product-workspace';
import styles from './landing.module.css';

const outcomes = [
  {
    title: 'Una agenda que todos entienden',
    description:
      'Consulta disponibilidad, asigna especialistas y detecta cruces antes de que afecten al cliente.',
  },
  {
    title: 'El historial acompaña cada atención',
    description:
      'Preferencias, servicios, pagos y notas permanecen vinculados a cada persona, no dispersos en chats.',
  },
  {
    title: 'El seguimiento deja de depender de tu memoria',
    description:
      'Renova prepara mensajes y recordatorios para que puedas recuperar clientes sin revisar listas manuales.',
  },
] as const;

const workflow = [
  {
    title: 'Registra la cita',
    description:
      'Cliente, servicio, especialista, hora y precio quedan relacionados desde el inicio.',
  },
  {
    title: 'Atiende con contexto',
    description: 'El equipo consulta la información necesaria sin buscar conversaciones antiguas.',
  },
  {
    title: 'Continúa la relación',
    description: 'Después de la visita, el sistema deja listo el siguiente contacto por WhatsApp.',
  },
] as const;

const questions = [
  {
    question: '¿Necesito instalar algo?',
    answer:
      'No. Renova funciona desde el navegador y puedes abrirlo desde una computadora, tablet o celular.',
  },
  {
    question: '¿Puedo probarlo con los datos de mi negocio?',
    answer:
      'Sí. La demo crea un espacio temporal con el nombre y rubro de tu negocio para que recorras el sistema durante 24 horas.',
  },
  {
    question: '¿La demo puede modificar o enviar campañas?',
    answer:
      'No. La demo es de solo lectura. Puedes conocer el flujo completo sin riesgo de alterar información o ejecutar campañas.',
  },
] as const;

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <h2 id={id}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function AgendaDetail() {
  return (
    <div className={styles.detailSurface} aria-label="Ejemplo visual de una agenda organizada">
      <div className={styles.detailHeader}>
        <div>
          <span>Agenda del equipo</span>
          <strong>Martes, 28 de julio</strong>
        </div>
        <span className={styles.status}>3 espacios disponibles</span>
      </div>
      <ol className={styles.appointmentList}>
        <li>
          <time>09:00</time>
          <span>
            <strong>Corte y tratamiento</strong>
            <small>María · 60 min</small>
          </span>
        </li>
        <li className={styles.currentAppointment}>
          <time>11:00</time>
          <span>
            <strong>Laciado brasilero</strong>
            <small>Camila · 120 min</small>
          </span>
        </li>
        <li>
          <time>14:30</time>
          <span>
            <strong>Manicure semipermanente</strong>
            <small>Andrea · 75 min</small>
          </span>
        </li>
      </ol>
    </div>
  );
}

function FollowUpDetail() {
  return (
    <div className={styles.messageSurface} aria-label="Ejemplo visual de seguimiento por WhatsApp">
      <div className={styles.messageContext}>
        <span>Seguimiento pendiente</span>
        <strong>Valeria Mendoza</strong>
        <small>Última visita: hace 28 días</small>
      </div>
      <div className={styles.messageBubble}>
        Hola Valeria, ya pasó un mes desde tu último tratamiento. ¿Deseas que reservemos un horario
        para esta semana?
      </div>
      <div className={styles.messageMeta}>
        <Clock3 aria-hidden="true" />
        <span>Programado para hoy, 10:30</span>
      </div>
    </div>
  );
}

function ClientDetail() {
  return (
    <div className={styles.clientSurface} aria-label="Ejemplo visual de historial de una cliente">
      <div className={styles.clientIdentity}>
        <span aria-hidden="true">VM</span>
        <div>
          <strong>Valeria Mendoza</strong>
          <small>Cliente desde febrero de 2025</small>
        </div>
      </div>
      <dl className={styles.clientFacts}>
        <div>
          <dt>Último servicio</dt>
          <dd>Hidratación capilar</dd>
        </div>
        <div>
          <dt>Próxima cita</dt>
          <dd>02 de agosto · 16:00</dd>
        </div>
        <div>
          <dt>Preferencia</dt>
          <dd>Atención por la tarde</dd>
        </div>
      </dl>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>

      <LandingHeader />

      <main id="contenido">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.shell}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.heroContext}>
                  <span aria-hidden="true" />
                  CRM para centros de belleza en Perú
                </p>
                <h1 id="hero-title">
                  Menos horas administrando. Más clientes que <em>sí regresan.</em>
                </h1>
                <p className={styles.heroLead}>
                  Renova reúne agenda, atenciones, clientes y seguimiento por WhatsApp en un sistema
                  pensado para el trabajo diario de tu negocio.
                </p>
                <div className={styles.heroActions}>
                  <Link className={styles.primaryAction} href="/demo">
                    Probar con mi negocio
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link className={styles.textAction} href="/login">
                    Ya soy cliente
                  </Link>
                </div>
                <p className={styles.assurance}>
                  <ShieldCheck aria-hidden="true" />
                  Demo gratuita de solo lectura. No requiere tarjeta.
                </p>
                <ul className={styles.heroProof} aria-label="Ventajas de la demo">
                  <li>
                    <Check aria-hidden="true" />
                    Con los datos de tu negocio
                  </li>
                  <li>
                    <Check aria-hidden="true" />
                    Acceso desde celular y computadora
                  </li>
                </ul>
              </div>

              <ProductWorkspace />
            </div>

            <dl className={styles.scopeList} aria-label="Áreas que reúne Renova">
              <div>
                <dt>Agenda</dt>
                <dd>Disponibilidad y citas del equipo.</dd>
              </div>
              <div>
                <dt>Clientes</dt>
                <dd>Historial y preferencias en contexto.</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>Seguimientos preparados a tiempo.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className={styles.outcomesSection} id="producto" aria-labelledby="outcomes-title">
          <div className={styles.shell}>
            <div className={styles.outcomesGrid}>
              <SectionHeading
                id="outcomes-title"
                title="Tu operación está repartida en demasiados lugares."
                description="Cuando la agenda vive en un cuaderno, los clientes en WhatsApp y los pagos en otra hoja, cada decisión tarda más y depende de recordar demasiado."
              />

              <ul className={styles.outcomeList}>
                {outcomes.map((outcome) => (
                  <li key={outcome.title}>
                    <h3>{outcome.title}</h3>
                    <p>{outcome.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.capabilitiesSection} aria-labelledby="capabilities-title">
          <div className={styles.shell}>
            <SectionHeading
              id="capabilities-title"
              title="La información aparece donde se necesita."
              description="Renova no agrega otra tarea a tu día. Ordena el recorrido que tu equipo ya realiza, desde la reserva hasta el próximo contacto."
            />
            <div className={styles.capabilityRows}>
              <article className={styles.capabilityRow}>
                <div className={styles.capabilityCopy}>
                  <span className={styles.capabilityIcon}>
                    <CalendarDays aria-hidden="true" />
                  </span>
                  <h3>Ve la carga real antes de confirmar una cita.</h3>
                  <p>
                    Organiza horarios por especialista, evita cruces y encuentra espacios libres sin
                    comparar conversaciones ni páginas de una agenda.
                  </p>
                  <ul>
                    <li>
                      <Check aria-hidden="true" /> Vista mensual y flujo de atenciones
                    </li>
                    <li>
                      <Check aria-hidden="true" /> Servicios y duración vinculados
                    </li>
                  </ul>
                </div>
                <AgendaDetail />
              </article>

              <article className={`${styles.capabilityRow} ${styles.capabilityRowReverse}`}>
                <div className={styles.capabilityCopy}>
                  <span className={styles.capabilityIcon}>
                    <MessageCircle aria-hidden="true" />
                  </span>
                  <h3>Contacta al cliente cuando todavía es relevante.</h3>
                  <p>
                    Prepara recordatorios y mensajes posteriores a la atención usando el contexto
                    que ya existe en Renova.
                  </p>
                  <ul>
                    <li>
                      <Check aria-hidden="true" /> Mensajes transaccionales y campañas
                    </li>
                    <li>
                      <Check aria-hidden="true" /> Historial visible para tu equipo
                    </li>
                  </ul>
                </div>
                <FollowUpDetail />
              </article>

              <article className={styles.capabilityRow}>
                <div className={styles.capabilityCopy}>
                  <span className={styles.capabilityIcon}>
                    <UsersRound aria-hidden="true" />
                  </span>
                  <h3>Deja de tratar cada visita como si fuera la primera.</h3>
                  <p>
                    Consulta servicios anteriores, preferencias, notas y próximas citas desde una
                    ficha ordenada y accesible.
                  </p>
                  <ul>
                    <li>
                      <Check aria-hidden="true" /> Registro de pagos y saldos
                    </li>
                    <li>
                      <Check aria-hidden="true" /> Información separada por negocio
                    </li>
                  </ul>
                </div>
                <ClientDetail />
              </article>
            </div>
          </div>
        </section>

        <section className={styles.workflowSection} id="flujo" aria-labelledby="workflow-title">
          <div className={styles.shell}>
            <div className={styles.workflowIntro}>
              <h2 id="workflow-title">De la reserva al regreso del cliente.</h2>
              <p>
                Cada acción deja el contexto listo para la siguiente. Tu equipo avanza sin volver a
                copiar información.
              </p>
            </div>
            <ol className={styles.workflowList}>
              {workflow.map((step, index) => (
                <li key={step.title}>
                  <span>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.pricingSection} id="precio" aria-labelledby="pricing-title">
          <div className={styles.shell}>
            <div className={styles.pricingGrid}>
              <div>
                <h2 id="pricing-title">Empieza pequeño. Ordena bien desde el inicio.</h2>
                <p>
                  Conoce el sistema usando el contexto de tu propio negocio. Si decides continuar,
                  te ayudamos a configurar la operación.
                </p>
              </div>
              <div className={styles.priceBlock}>
                <p>Plan mensual</p>
                <strong>
                  S/ 75 <span>/ mes</span>
                </strong>
                <ul>
                  <li>
                    <Check aria-hidden="true" /> Agenda, clientes y atenciones
                  </li>
                  <li>
                    <Check aria-hidden="true" /> WhatsApp y seguimiento
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Soporte de configuración
                  </li>
                </ul>
                <Link className={styles.lightAction} href="/demo">
                  Crear mi demo
                  <ArrowRight aria-hidden="true" />
                </Link>
                <small>La demo dura 24 horas y no realiza cambios.</small>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.faqSection} aria-labelledby="faq-title">
          <div className={styles.shell}>
            <div className={styles.faqGrid}>
              <div>
                <h2 id="faq-title">Preguntas frecuentes</h2>
              </div>
              <div className={styles.faqList}>
                {questions.map((item) => (
                  <details key={item.question}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.shell}>
          <div className={styles.footerGrid}>
            <div>
              <Link className={styles.brand} href="/" aria-label="Renova CRM, inicio">
                <span aria-hidden="true">R</span>
                <strong>Renova</strong>
              </Link>
              <p>Operación y seguimiento para centros de belleza.</p>
            </div>
            <nav aria-label="Enlaces legales">
              <ul>
                <li>
                  <Link href="/terminos">Términos</Link>
                </li>
                <li>
                  <Link href="/login">Acceso a clientes</Link>
                </li>
              </ul>
            </nav>
            <small>© {new Date().getFullYear()} Renova CRM</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
