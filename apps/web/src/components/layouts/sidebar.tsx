'use client';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar, resetToggleSidebar } from '@/store/themeConfigSlice';
import { IRootState } from '@/store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconMenuCalendar from '@/components/icon/menu/icon-menu-calendar';
import IconMenuDatatables from '@/components/icon/menu/icon-menu-datatables';
import IconMenuApps from '@/components/icon/menu/icon-menu-apps';
import IconSettings from '@/components/icon/icon-settings';
import IconMinus from '@/components/icon/icon-minus';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Coins } from 'lucide-react';

const sectionTitleClass =
  'sidebar-section-title -mx-4 mb-1 mt-4 flex items-center px-7 py-2 text-xs font-semibold leading-4 tracking-wide text-muted dark:text-white-dark';

const Sidebar = () => {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const [role, setRole] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('NAVIER');
  const [initials, setInitials] = useState<string>('NV');
  const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, company_id')
          .eq('id', user.id)
          .single();
        if (profile) {
          setRole(profile.role);
          if (profile.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profile.company_id)
              .single();
            if (company && company.name) {
              setCompanyName(company.name);
              const words = company.name.trim().split(' ');
              const inits = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
              setInitials(inits.toUpperCase());
            }
          }
        }
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    const activeLinks = document.querySelectorAll('.sidebar ul a.active');
    activeLinks.forEach((element) => element.classList.remove('active'));
    const selector = document.querySelector<HTMLAnchorElement>(
      `.sidebar ul a[href="${CSS.escape(pathname)}"]`,
    );
    selector?.classList.add('active');
    if (window.innerWidth < 1024) {
      dispatch(resetToggleSidebar());
    }
  }, [dispatch, pathname]);

  return (
    <div className={semidark ? 'dark' : ''}>
      <nav
        className={`sidebar fixed inset-y-0 bottom-0 top-0 z-50 h-[100dvh] max-h-[100dvh] w-[260px] overflow-hidden shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-transform duration-300 ease-out ${semidark ? 'text-white-dark' : ''}`}
      >
        <div className="flex h-full min-h-0 flex-col bg-white dark:bg-dark border-r border-black-light dark:border-dark-light">
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <Link
              href={role === 'super_admin' ? '/admin' : '/dashboard'}
              className="main-logo flex shrink-0 items-center"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-none transition duration-300 ease-out">
                {initials}
              </div>
              <span className="align-middle text-lg font-bold ltr:ml-2.5 rtl:mr-2.5 dark:text-white-light lg:inline transition duration-300 ease-out truncate w-[160px]">
                {companyName}
              </span>
            </Link>

            <button
              type="button"
              className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
              onClick={() => dispatch(toggleSidebar())}
            >
              <IconCaretsDown className="m-auto rotate-90" />
            </button>
          </div>

          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <ul className="relative space-y-0.5 p-4 py-0 pb-8 font-semibold">
              {role === 'super_admin' && (
                <>
                  <h2 className={sectionTitleClass}>
                    <IconMinus className="hidden h-5 w-4 flex-none" />
                    <span>Administración</span>
                  </h2>
                  <li className="nav-item">
                    <Link href="/admin" className="nav-link group">
                      <div className="flex items-center">
                        <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Panel Admin
                        </span>
                      </div>
                    </Link>
                  </li>
                </>
              )}

              {(role === 'tenant' || role === 'owner' || role === 'employee') && (
                <>
                  <h2 className={sectionTitleClass}>
                    <IconMinus className="hidden h-5 w-4 flex-none" />
                    <span>Inicio</span>
                  </h2>

                  <li className="nav-item">
                    <Link href="/dashboard" className="nav-link group">
                      <div className="flex items-center">
                        <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Dashboard
                        </span>
                      </div>
                    </Link>
                  </li>

                  <h2 className={sectionTitleClass}>
                    <IconMinus className="hidden h-5 w-4 flex-none" />
                    <span>Gestión del negocio</span>
                  </h2>

                  <li className="nav-item">
                    <Link href="/dashboard/agenda" className="nav-link nav-agenda group">
                      <div className="flex items-center">
                        <IconMenuCalendar className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Agenda & Citas
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link href="/dashboard/atenciones" className="nav-link nav-atenciones group">
                      <div className="flex items-center">
                        <IconMenuDatatables className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Atenciones (Historial)
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link href="/dashboard/trabajadoras" className="nav-link group">
                      <div className="flex items-center">
                        <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Equipo
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link href="/dashboard/servicios" className="nav-link group">
                      <div className="flex items-center">
                        <IconMenuApps className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Servicios
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link href="/dashboard/clientes" className="nav-link group">
                      <div className="flex items-center">
                        <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Clientes
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link href="/dashboard/cobranza" className="nav-link group">
                      <div className="flex items-center">
                        <Coins className="shrink-0 group-hover:!text-primary w-5 h-5 text-muted" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Cobranza
                        </span>
                      </div>
                    </Link>
                  </li>

                  <h2 className={sectionTitleClass}>
                    <IconMinus className="hidden h-5 w-4 flex-none" />
                    <span>Marketing</span>
                  </h2>

                  <li className="nav-item">
                    <Link href="/dashboard/campanas" className="nav-link group">
                      <div className="flex items-center">
                        <IconMenuChat className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Campañas
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link href="/dashboard/mensajeria" className="nav-link nav-mensajeria group">
                      <div className="flex items-center">
                        <IconMenuChat className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Mensajería
                        </span>
                      </div>
                    </Link>
                  </li>

                  <h2 className={sectionTitleClass}>
                    <IconMinus className="hidden h-5 w-4 flex-none" />
                    <span>Ajustes</span>
                  </h2>

                  <li className="nav-item">
                    <Link href="/dashboard/configuracion" className="nav-link group">
                      <div className="flex items-center">
                        <IconSettings className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Configuración
                        </span>
                      </div>
                    </Link>
                  </li>

                  <li className="nav-item mt-4">
                    <Link href="/terminos" className="nav-link group" target="_blank">
                      <div className="flex items-center">
                        <IconInfoCircle className="shrink-0 group-hover:!text-primary" />
                        <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">
                          Términos y Políticas
                        </span>
                      </div>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
