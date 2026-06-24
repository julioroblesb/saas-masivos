'use client';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { IRootState } from '@/store';
import { toggleTheme, toggleSidebar, toggleRTL } from '@/store/themeConfigSlice';
import Dropdown from '@/components/dropdown';
import IconMenu from '@/components/icon/icon-menu';
import IconSun from '@/components/icon/icon-sun';
import IconMoon from '@/components/icon/icon-moon';
import IconLaptop from '@/components/icon/icon-laptop';
import IconUser from '@/components/icon/icon-user';
import IconLogout from '@/components/icon/icon-logout';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const Header = () => {
    const pathname = usePathname();
    const dispatch = useDispatch();
    const router = useRouter();

    const [userEmail, setUserEmail] = useState<string>('');
    const [role, setRole] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('SaaS Masivos');

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');
                const { data: profile } = await supabase.from('profiles').select('role, company_id').eq('id', user.id).single();
                if (profile) {
                    setRole(profile.role);
                    if (profile.company_id) {
                        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.company_id).single();
                        if (company) setCompanyName(company.name);
                    }
                }
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);

    return (
        <header className={`z-40 ${themeConfig.semidark && themeConfig.menu === 'horizontal' ? 'dark' : ''}`}>
            <div className="shadow-sm">
                <div className="relative flex w-full items-center bg-white dark:bg-dark border-b border-black-light dark:border-dark-light px-5 py-2.5">
                    <div className="horizontal-logo flex items-center justify-between ltr:mr-2 rtl:ml-2 lg:hidden">
                        <Link href={role === 'super_admin' ? '/admin' : '/dashboard'} className="main-logo flex shrink-0 items-center">
                            <span className="align-middle text-2xl font-semibold transition duration-300 ease-out ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light md:inline">{companyName}</span>
                        </Link>
                        <button
                            type="button"
                            className="collapse-icon flex flex-none rounded-full bg-black-light/10 p-2 hover:bg-black-light/20 hover:text-primary ltr:ml-2 rtl:mr-2 dark:bg-dark-light/40 dark:text-muted dark:hover:bg-dark-light/60 dark:hover:text-primary lg:hidden"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconMenu className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center space-x-1.5 ltr:ml-auto rtl:mr-auto rtl:space-x-reverse dark:text-[#d0d2d6] sm:flex-1 ltr:sm:ml-0 sm:rtl:mr-0 lg:space-x-2">
                        <div className="sm:ltr:mr-auto sm:rtl:ml-auto"></div>
                        <div>
                            {themeConfig.theme === 'light' ? (
                                <button
                                    className={`${
                                        themeConfig.theme === 'light' &&
                                        'flex items-center rounded-full bg-black-light/10 p-2 hover:bg-black-light/20 hover:text-primary dark:bg-dark-light/40 dark:hover:bg-dark-light/60'
                                    }`}
                                    onClick={() => dispatch(toggleTheme('dark'))}
                                >
                                    <IconSun />
                                </button>
                            ) : (
                                ''
                            )}
                            {themeConfig.theme === 'dark' && (
                                <button
                                    className={`${
                                        themeConfig.theme === 'dark' &&
                                        'flex items-center rounded-full bg-black-light/10 p-2 hover:bg-black-light/20 hover:text-primary dark:bg-dark-light/40 dark:hover:bg-dark-light/60'
                                    }`}
                                    onClick={() => dispatch(toggleTheme('light'))}
                                >
                                    <IconMoon />
                                </button>
                            )}
                        </div>

                        <div className="dropdown flex shrink-0">
                            <Dropdown
                                offset={[0, 8]}
                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                btnClassName="relative group block"
                                button={<span className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <IconUser className="w-5 h-5" />
                                        </span>}
                            >
                                <ul className="w-[230px] !py-0 font-semibold text-dark dark:text-white-dark dark:text-white-light/90">
                                    <li>
                                        <div className="flex items-center px-4 py-4">
                                            <span className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary">
                                                <IconUser className="w-6 h-6" />
                                            </span>
                                            <div className="truncate ltr:pl-4 rtl:pr-4">
                                                <h4 className="text-base">
                                                    Mi Cuenta
                                                    <span className="rounded bg-success-light px-1 text-xs text-success ltr:ml-2 rtl:ml-2">{role}</span>
                                                </h4>
                                                <button type="button" className="text-black/60 hover:text-primary dark:text-dark-light/60 dark:hover:text-white">
                                                    {userEmail}
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                    <li className="border-t border-black-light dark:border-dark-light">
                                        <button onClick={handleLogout} className="!py-3 text-danger w-full text-left flex items-center px-4 hover:bg-danger/10">
                                            <IconLogout className="h-4.5 w-4.5 shrink-0 rotate-90 ltr:mr-2 rtl:ml-2" />
                                            Cerrar Sesión
                                        </button>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
