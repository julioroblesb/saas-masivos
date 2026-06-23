'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import clsx from 'clsx';
import { X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Megaphone, Settings, FileText, UserPlus, CalendarCheck, Package } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Atenciones', href: '/dashboard/atenciones', icon: CalendarCheck },
  { label: 'Trabajadoras', href: '/dashboard/trabajadoras', icon: UserPlus },
  { label: 'Servicios', href: '/dashboard/servicios', icon: Megaphone },
  { label: 'Productos', href: '/dashboard/productos', icon: Package },
  { label: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { label: 'Campañas', href: '/dashboard/campanas', icon: Megaphone },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    async function loadCompany() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profile?.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profile.company_id)
            .single();
          if (company?.name) {
            setCompanyName(company.name);
          }
        }
      } catch (e) {
        console.error('Error fetching company:', e);
      }
    }
    loadCompany();
  }, []);

  const initial = companyName ? companyName.substring(0, 2).toUpperCase() : 'LR';
  const displayName = companyName || 'Cargando...';

  return (
    <div className="min-h-screen bg-[#f4f4f5] dark:bg-[#111827] text-zinc-900 dark:text-gray-100 font-sans transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} companyName={companyName} />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          {/* Mobile Drawer */}
          <div className="relative flex flex-col w-[280px] h-full bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300">
            <div className="flex h-20 items-center justify-between px-4 border-b border-zinc-200 dark:border-gray-700">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{initial}</span>
                </div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white truncate" title={displayName}>
                  {displayName}
                </h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-2 px-3">
                {menuItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={clsx(
                          "flex items-center h-12 rounded-lg px-3 transition-colors",
                          isActive 
                            ? "bg-zinc-100 dark:bg-gray-700 text-zinc-900 dark:text-white font-medium" 
                            : "text-zinc-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-gray-800"
                        )}
                      >
                        <Icon className={clsx(isActive ? "text-indigo-500" : "")} size={20} />
                        <span className="ml-3">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={clsx(
        "flex flex-col min-h-screen transition-all duration-300",
        collapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
      )}>
        <DashboardHeader collapsed={collapsed} setMobileMenuOpen={setMobileMenuOpen} />
        
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
