import { CalendarDays, ChevronLeft, ChevronRight, UsersRound } from 'lucide-react';
import styles from './landing.module.css';

const days = [
  { day: 'LUN', date: '27', active: false },
  { day: 'MAR', date: '28', active: true },
  { day: 'MIÉ', date: '29', active: false },
  { day: 'JUE', date: '30', active: false },
] as const;

export function ProductWorkspace() {
  return (
    <figure className={styles.workspace}>
      <figcaption className={styles.srOnly}>
        Vista simplificada de la agenda de Renova CRM
      </figcaption>

      <div className={styles.workspaceTopbar}>
        <div className={styles.workspaceBrand}>
          <span aria-hidden="true">R</span>
          <strong>Renova</strong>
        </div>
        <span>Studio Valentina</span>
      </div>

      <div className={styles.workspaceBody}>
        <aside className={styles.workspaceSidebar} aria-label="Secciones de ejemplo">
          <span className={styles.workspaceNavActive}>
            <CalendarDays aria-hidden="true" />
            Agenda
          </span>
          <span>
            <UsersRound aria-hidden="true" />
            Clientes
          </span>
        </aside>

        <div className={styles.workspaceMain}>
          <div className={styles.workspaceHeading}>
            <div>
              <span>Agenda</span>
              <strong>Julio 2026</strong>
            </div>
            <div aria-hidden="true">
              <ChevronLeft />
              <ChevronRight />
            </div>
          </div>

          <div className={styles.dayGrid}>
            {days.map((item) => (
              <div className={item.active ? styles.activeDay : undefined} key={item.date}>
                <span>{item.day}</span>
                <strong>{item.date}</strong>
              </div>
            ))}
          </div>

          <div className={styles.schedule}>
            <span className={styles.scheduleTime}>09:00</span>
            <div className={styles.appointment}>
              <strong>Corte + hidratación</strong>
              <span>Valeria Mendoza · Andrea</span>
            </div>
            <span className={styles.scheduleTime}>11:00</span>
            <div className={`${styles.appointment} ${styles.appointmentAccent}`}>
              <strong>Laciado brasilero</strong>
              <span>Camila Rojas · Mariela</span>
            </div>
            <span className={styles.scheduleTime}>13:30</span>
            <div className={styles.freeSlot}>Horario disponible</div>
          </div>
        </div>
      </div>
    </figure>
  );
}
