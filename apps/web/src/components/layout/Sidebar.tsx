'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, Users, Megaphone, Settings, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import Image from 'next/image';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Atenciones', href: '/dashboard/atenciones', icon: Users },
  { label: 'Servicios', href: '/dashboard/servicios', icon: Megaphone },
  { label: 'Productos', href: '/dashboard/productos', icon: FileText },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

export function Sidebar({ 
  collapsed, 
  setCollapsed,
  companyName 
}: { 
  collapsed: boolean, 
  setCollapsed: (c: boolean) => void,
  companyName?: string 
}) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  const isCollapsed = collapsed && !hovered;

  // Use the first two letters of the company name for the logo, or 'LR' as fallback
  const initial = companyName ? companyName.substring(0, 2).toUpperCase() : 'LR';
  const displayName = companyName || 'Cargando...';

  return (
    <div 
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-[#0A0A0A] border-r border-[#E4E4E7] dark:border-[#27272A] transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-[280px]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex h-20 items-center justify-between px-4 border-b border-[#E4E4E7] dark:border-[#27272A]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_4px_14px_0_rgba(225,29,72,0.39)]">
             <span className="text-white font-black tracking-tight">{initial}</span>
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-black dark:text-white truncate tracking-tighter" title={displayName}>
              {displayName}
            </h1>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center h-12 rounded-xl px-3 transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] group",
                    isActive 
                      ? "bg-primary/10 text-primary font-bold dark:bg-primary/20" 
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#1A1A1A] hover:text-black dark:hover:text-white"
                  )}
                >
                  <Icon className={clsx("flex-shrink-0 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "text-zinc-400 group-hover:text-primary")} size={20} />
                  {!isCollapsed && <span className="ml-3 truncate tracking-tight">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-[#E4E4E7] dark:border-[#27272A]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center h-10 rounded-xl transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] hover:bg-zinc-100 dark:hover:bg-[#1A1A1A] text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
}
