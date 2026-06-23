'use client';

import React from 'react';
import { motion, type Variants } from 'motion/react';
import IconUsers from '@/components/icon/icon-users';
import IconDollarSignCircle from '@/components/icon/icon-dollar-sign-circle';
import IconMessage2 from '@/components/icon/icon-message2';
import IconHeart from '@/components/icon/icon-heart';

interface SpaDashboardProps {
  metrics: {
    clients_today: number;
    revenue_today: number;
    auto_messages_7d: number;
    recovered_clients: number;
  };
}

export function SpaDashboard({ metrics }: SpaDashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >
      
      {/* Encabezado limpio */}
      <motion.div variants={item} className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tighter text-black dark:text-white">Resumen de Actividad</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-2 text-lg">Métricas de hoy y rendimiento automatizado.</p>
      </motion.div>

      {/* Bento Grid Asimétrico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta Principal (Ingresos) - Ocupa 2 columnas */}
        <motion.div variants={item} className="md:col-span-2 relative flex flex-col justify-between rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1 bg-white border border-[#E4E4E7] shadow-sm dark:bg-[#111] dark:border-[#27272A] dark:shadow-none overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <span className="text-gray-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-widest">Ingresos de Hoy</span>
              <span className="text-black dark:text-white text-6xl font-bold tracking-tighter mt-2">
                {formatCurrency(metrics.revenue_today || 0)}
              </span>
            </div>
            <div className="p-4 bg-[#FAFAFA] dark:bg-[#1A1A1A] rounded-2xl group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
              <IconDollarSignCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="relative z-10 mt-12 pt-6 border-t border-[#E4E4E7] dark:border-[#27272A]">
            <p className="text-sm text-gray-500 dark:text-zinc-500">Comparado con el promedio semanal</p>
          </div>
          
          {/* Acento decorativo sutil en la tarjeta principal */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>
        </motion.div>

        {/* Tarjetas Secundarias Apiladas */}
        <div className="flex flex-col gap-6">
          <motion.div variants={item} className="relative flex items-center justify-between rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 bg-white border border-[#E4E4E7] shadow-sm dark:bg-[#111] dark:border-[#27272A] group">
            <div className="flex flex-col space-y-1">
              <span className="text-gray-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-widest">Clientes</span>
              <span className="text-black dark:text-white text-4xl font-bold tracking-tighter">{metrics.clients_today || 0}</span>
            </div>
            <div className="p-3 bg-[#FAFAFA] dark:bg-[#1A1A1A] rounded-xl group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
              <IconUsers className="h-6 w-6 text-black dark:text-white" />
            </div>
          </motion.div>

          <motion.div variants={item} className="relative flex items-center justify-between rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 bg-primary text-white shadow-[0_8px_30px_rgba(225,29,72,0.3)] dark:shadow-[0_8px_30px_rgba(225,29,72,0.15)] group">
            <div className="flex flex-col space-y-1">
              <span className="text-white/80 text-sm font-medium uppercase tracking-widest">Autómata</span>
              <span className="text-white text-4xl font-bold tracking-tighter">{metrics.auto_messages_7d || 0}</span>
            </div>
            <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
              <IconMessage2 className="h-6 w-6 text-white" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fila Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div variants={item} className="rounded-[2rem] border border-[#E4E4E7] bg-white p-8 shadow-sm dark:border-[#27272A] dark:bg-[#111]">
          <div className="mb-6 flex items-center justify-between">
            <h5 className="text-2xl font-semibold tracking-tight text-black dark:text-white">Clientes Recuperados</h5>
            <span className="flex items-center gap-2 text-sm font-bold text-success bg-success/10 px-3 py-1 rounded-full">
              <IconHeart className="h-4 w-4" />
              {metrics.recovered_clients || 0}
            </span>
          </div>
          <div className="flex h-32 items-center justify-center text-gray-400 border border-dashed border-[#E4E4E7] dark:border-[#27272A] rounded-2xl">
            Gráfico de recuperación (Próximamente)
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-[2rem] border border-[#E4E4E7] bg-white p-8 shadow-sm dark:border-[#27272A] dark:bg-[#111]">
          <div className="mb-6 flex items-center justify-between">
            <h5 className="text-2xl font-semibold tracking-tight text-black dark:text-white">Actividad Reciente</h5>
          </div>
          <div className="flex h-32 items-center justify-center text-gray-400 border border-dashed border-[#E4E4E7] dark:border-[#27272A] rounded-2xl">
            Lista de citas (Próximamente)
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
