import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import styles from './landing.module.css';

export function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Renova CRM, inicio">
            <BrandMark className={styles.brandMark} size={36} priority />
            <strong>Renova</strong>
          </Link>

          <nav className={styles.primaryNav} aria-label="Navegación principal">
            <ul>
              <li>
                <a href="#producto">Producto</a>
              </li>
              <li>
                <a href="#flujo">Cómo funciona</a>
              </li>
              <li>
                <a href="#precio">Precio</a>
              </li>
            </ul>
          </nav>

          <div className={styles.headerActions}>
            <Link className={styles.loginLink} href="/login">
              Ingresar
            </Link>
            <Link className={styles.headerCta} href="/demo">
              Ver demo
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
