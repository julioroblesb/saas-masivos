'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconMenuCalendar from '@/components/icon/menu/icon-menu-calendar';
import IconMenuApps from '@/components/icon/menu/icon-menu-apps';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconSettings from '@/components/icon/icon-settings';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMinus from '@/components/icon/icon-minus';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Coins } from 'lucide-react';

const Sidebar = () => {
    const dispatch = useDispatch();
    const pathname = usePathname();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [role, setRole] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('NAVIER');
    const [initials, setInitials] = useState<string>('NV');
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);

    useEffect(() => {
        const fetchRole = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role, company_id').eq('id', user.id).single();
                if (profile) {
                    setRole(profile.role);
                    if (profile.company_id) {
                        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
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

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        setActiveRoute();
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    const setActiveRoute = () => {
        let allLinks = document.querySelectorAll('.sidebar ul a.active');
        for (let i = 0; i < allLinks.length; i++) {
            const element = allLinks[i];
            element?.classList.remove('active');
        }
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        selector?.classList.add('active');
    };

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-[100dvh] w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-transform duration-300 ease-out ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="h-full bg-white dark:bg-dark border-r border-black-light dark:border-dark-light">
                    <div className="flex items-center justify-between px-4 py-3">
                        <Link href={role === 'super_admin' ? '/admin' : '/dashboard'} className="main-logo flex shrink-0 items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-none transition duration-300 ease-out">
                                {initials}
                            </div>
                            <span className="align-middle text-[1.15rem] font-bold ltr:ml-2.5 rtl:mr-2.5 dark:text-white-light lg:inline transition duration-300 ease-out truncate w-[160px]">{companyName}</span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className="relative space-y-0.5 p-4 py-0 font-semibold">
                            {role === 'super_admin' && (
                                <>
                                    <h2 className="-mx-4 mb-1 mt-4 flex items-center bg-black-light/5 px-7 py-3 font-extrabold uppercase dark:bg-dark-light/10">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>Administración</span>
                                    </h2>
                                    <li className="nav-item">
                                        <Link href="/admin" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Panel Admin</span>
                                            </div>
                                        </Link>
                                    </li>
                                </>
                            )}

                            {role === 'tenant' && (
                                <>
                                    <h2 className="-mx-4 mb-1 mt-4 flex items-center bg-black-light/5 px-7 py-3 font-extrabold uppercase dark:bg-dark-light/10">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>Inicio</span>
                                    </h2>
                                    <li className="nav-item">
                                        <Link href="/dashboard" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Dashboard</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <h2 className="-mx-4 mb-1 mt-4 flex items-center bg-black-light/5 px-7 py-3 font-extrabold uppercase dark:bg-dark-light/10">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>Gestión Spa</span>
                                    </h2>

                                    <li className="nav-item">
                                        <Link href="/dashboard/atenciones" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuCalendar className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Atenciones</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/trabajadoras" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Equipo</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/servicios" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuApps className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Servicios</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/productos" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuWidgets className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Productos</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/clientes" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Clientes</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/cobranza" className="nav-link group">
                                            <div className="flex items-center">
                                                <Coins className="shrink-0 group-hover:!text-primary w-5 h-5 text-muted" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Cobranza</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <h2 className="-mx-4 mb-1 mt-4 flex items-center bg-black-light/5 px-7 py-3 font-extrabold uppercase dark:bg-dark-light/10">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>Marketing</span>
                                    </h2>

                                    <li className="nav-item">
                                        <Link href="/dashboard/campanas" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Campañas</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/mensajeria" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Mensajería</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item">
                                        <Link href="/dashboard/bot" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconMenuChat className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Bot de IA</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <h2 className="-mx-4 mb-1 mt-4 flex items-center bg-black-light/5 px-7 py-3 font-extrabold uppercase dark:bg-dark-light/10">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>Ajustes</span>
                                    </h2>

                                    <li className="nav-item">
                                        <Link href="/dashboard/configuracion" className="nav-link group">
                                            <div className="flex items-center">
                                                <IconSettings className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Configuración</span>
                                            </div>
                                        </Link>
                                    </li>

                                    <li className="nav-item mt-4">
                                        <Link href="/terminos" className="nav-link group" target="_blank">
                                            <div className="flex items-center">
                                                <IconInfoCircle className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-ink ltr:pl-3 rtl:pr-3 dark:text-muted dark:group-hover:text-white-light">Términos y Políticas</span>
                                            </div>
                                        </Link>
                                    </li>
                                </>
                            )}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
