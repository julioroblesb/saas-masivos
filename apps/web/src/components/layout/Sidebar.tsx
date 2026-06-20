'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, Users, Megaphone, Settings, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import Image from 'next/image';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { label: 'Campañas', href: '/dashboard/campanas', icon: Megaphone },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
  { label: 'Políticas', href: '/terminos', icon: FileText },
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
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-[#1f2937] border-r border-zinc-200 dark:border-gray-700 transition-all duration-300",
        isCollapsed ? "w-[72px]" : "w-[280px]"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex h-20 items-center justify-between px-4 border-b border-zinc-200 dark:border-gray-700">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
             <span className="text-white font-bold">{initial}</span>
          </div>
          {!isCollapsed && (
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white truncate" title={displayName}>
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
                    "flex items-center h-12 rounded-lg px-3 transition-colors",
                    isActive 
                      ? "bg-zinc-100 dark:bg-gray-700 text-zinc-900 dark:text-white font-medium" 
                      : "text-zinc-600 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className={clsx("flex-shrink-0", isActive ? "text-indigo-500" : "")} size={20} />
                  {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-gray-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center h-10 rounded-lg hover:bg-zinc-100 dark:hover:bg-gray-800 text-zinc-500 dark:text-gray-400"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
}
