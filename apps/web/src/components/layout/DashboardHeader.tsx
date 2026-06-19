'use client';

import React from 'react';
import clsx from 'clsx';
import { Menu, Search, Bell, Moon, Sun, User as UserIcon } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function DashboardHeader({ collapsed, setMobileMenuOpen }: { collapsed: boolean, setMobileMenuOpen: (v: boolean) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <header className={clsx(
      "sticky top-0 z-30 transition-all duration-300 bg-white/80 dark:bg-[#1f2937]/80 backdrop-blur-md border-b border-zinc-200 dark:border-gray-700",
      collapsed ? "lg:ml-[72px]" : "lg:ml-[280px]"
    )}>
      <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Mobile Menu Toggle & Search */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 text-zinc-600 dark:text-gray-300 hover:bg-zinc-100 dark:hover:bg-gray-700 rounded-md"
          >
            <Menu size={24} />
          </button>
          
          <div className="hidden sm:flex items-center gap-2 bg-zinc-100 dark:bg-gray-800 px-3 py-2 rounded-full border border-zinc-200 dark:border-gray-700">
             <Search size={18} className="text-zinc-500" />
             <input 
               type="text" 
               placeholder="Buscar..." 
               className="bg-transparent border-none outline-none text-sm text-zinc-700 dark:text-gray-200 w-64"
             />
          </div>
        </div>

        {/* Right Side: Tools & Profile */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={toggleDark} className="text-zinc-600 dark:text-gray-300 hover:text-indigo-500 transition-colors">
            {isDark ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          
          <button className="relative text-zinc-600 dark:text-gray-300 hover:text-indigo-500 transition-colors">
            <Bell size={22} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
          </button>

          <div className="relative group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-zinc-300 dark:border-gray-600">
                <UserIcon size={20} className="text-zinc-500 dark:text-gray-400" />
              </div>
            </div>
            {/* Dropdown Profile */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-zinc-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
               <div className="p-4 border-b border-zinc-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Mi Cuenta</p>
               </div>
               <div className="p-2">
                 <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                   Cerrar Sesión
                 </button>
               </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
