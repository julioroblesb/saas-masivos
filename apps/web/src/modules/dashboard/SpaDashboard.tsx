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
        staggerChildren: 0.05
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", duration: 0.5, bounce: 0.2 } }
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
        <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white">Resumen de Actividad</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Métricas de hoy y rendimiento automatizado.</p>
      </motion.div>

      {/* Bento Grid Asimétrico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta Principal (Ingresos) - Ocupa 2 columnas */}
        <motion.div variants={item} className="md:col-span-2 relative flex flex-col justify-between rounded-3xl p-8 bg-white border border-black-light shadow-sm dark:bg-dark dark:border-dark-light dark:shadow-none overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Ingresos de Hoy</span>
              <span className="text-black dark:text-white text-5xl md:text-6xl font-bold tracking-tighter mt-2">
                {formatCurrency(metrics.revenue_today || 0)}
              </span>
            </div>
            <div className="p-4 bg-white-light dark:bg-zinc-900 rounded-2xl">
              <IconDollarSignCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="relative z-10 mt-12 pt-6 border-t border-black-light dark:border-dark-light">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Comparado con el promedio semanal</p>
          </div>
        </motion.div>

        {/* Tarjetas Secundarias Apiladas */}
        <div className="flex flex-col gap-6">
          <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-white border border-black-light shadow-sm dark:bg-dark dark:border-dark-light group">
            <div className="flex flex-col space-y-1">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-widest">Clientes</span>
              <span className="text-black dark:text-white text-4xl font-bold tracking-tight">{metrics.clients_today || 0}</span>
            </div>
            <div className="p-3 bg-white-light dark:bg-zinc-900 rounded-xl">
              <IconUsers className="h-6 w-6 text-black dark:text-white" />
            </div>
          </motion.div>

          <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-primary text-white shadow-sm group">
            <div className="flex flex-col space-y-1">
              <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">Autómata</span>
              <span className="text-white text-4xl font-bold tracking-tight">{metrics.auto_messages_7d || 0}</span>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <IconMessage2 className="h-6 w-6 text-white" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fila Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div variants={item} className="rounded-3xl border border-black-light bg-white p-8 shadow-sm dark:border-dark-light dark:bg-dark">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight text-black dark:text-white">Clientes Recuperados</h3>
            <span className="flex items-center gap-2 text-sm font-bold text-success bg-success/10 px-3 py-1 rounded-full">
              <IconHeart className="h-4 w-4" />
              {metrics.recovered_clients || 0}
            </span>
          </div>
          <div className="flex h-32 items-center justify-center text-zinc-400 border border-dashed border-black-light dark:border-dark-light rounded-2xl">
            Gráfico de recuperación (Próximamente)
          </div>
        </motion.div>

        <motion.div variants={item} className="rounded-3xl border border-black-light bg-white p-8 shadow-sm dark:border-dark-light dark:bg-dark">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight text-black dark:text-white">Actividad Reciente</h3>
          </div>
          <div className="flex h-32 items-center justify-center text-zinc-400 border border-dashed border-black-light dark:border-dark-light rounded-2xl">
            Lista de citas (Próximamente)
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
