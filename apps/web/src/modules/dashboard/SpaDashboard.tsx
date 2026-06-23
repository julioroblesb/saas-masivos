'use client';

import React from 'react';
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

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
      
      {/* Encabezado sin Eyebrows y con tipografía limpia */}
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-black dark:text-white">Resumen de Actividad</h1>
        <p className="text-gray-500 mt-1">Métricas de hoy y rendimiento automatizado.</p>
      </div>

      {/* Bento Grid Asimétrico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta Principal (Ingresos) - Ocupa 2 columnas */}
        <div className="md:col-span-2 relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 hover:scale-[1.01] bg-white border border-[#EBEBEB] shadow-sm dark:bg-[#111111] dark:border-[#2A2A2A] overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Ingresos de Hoy</span>
              <span className="text-black dark:text-white text-5xl font-semibold tracking-tighter">
                {formatCurrency(metrics.revenue_today || 0)}
              </span>
            </div>
            <div className="p-4 bg-[#F5F5F3] dark:bg-[#1A1A1A] rounded-2xl">
              <IconDollarSignCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <div className="relative z-10 mt-12 pt-6 border-t border-[#EBEBEB] dark:border-[#2A2A2A]">
            <p className="text-sm text-gray-500">Comparado con el promedio semanal</p>
          </div>
        </div>

        {/* Tarjetas Secundarias Apiladas */}
        <div className="flex flex-col gap-6">
          <div className="relative flex items-center justify-between rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] bg-white border border-[#EBEBEB] shadow-sm dark:bg-[#111111] dark:border-[#2A2A2A]">
            <div className="flex flex-col space-y-1">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Clientes Atendidos</span>
              <span className="text-black dark:text-white text-3xl font-semibold tracking-tight">{metrics.clients_today || 0}</span>
            </div>
            <div className="p-3 bg-[#F5F5F3] dark:bg-[#1A1A1A] rounded-xl">
              <IconUsers className="h-6 w-6 text-black dark:text-white" />
            </div>
          </div>

          <div className="relative flex items-center justify-between rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] bg-primary text-white shadow-md">
            <div className="flex flex-col space-y-1">
              <span className="text-white/80 text-sm font-medium">Mensajes Automáticos</span>
              <span className="text-white text-3xl font-semibold tracking-tight">{metrics.auto_messages_7d || 0}</span>
            </div>
            <div className="p-3 bg-white/20 rounded-xl">
              <IconMessage2 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Fila Inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="rounded-3xl border border-[#EBEBEB] bg-white p-8 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
          <div className="mb-6 flex items-center justify-between">
            <h5 className="text-xl font-medium text-black dark:text-white">Clientes Recuperados</h5>
            <span className="flex items-center gap-2 text-sm font-medium text-success bg-success-light px-3 py-1 rounded-full">
              <IconHeart className="h-4 w-4" />
              {metrics.recovered_clients || 0}
            </span>
          </div>
          <div className="flex h-32 items-center justify-center text-gray-400 border border-dashed border-[#EBEBEB] dark:border-[#2A2A2A] rounded-xl">
            Gráfico de recuperación (Próximamente)
          </div>
        </div>

        <div className="rounded-3xl border border-[#EBEBEB] bg-white p-8 shadow-sm dark:border-[#2A2A2A] dark:bg-[#111111]">
          <div className="mb-6 flex items-center justify-between">
            <h5 className="text-xl font-medium text-black dark:text-white">Actividad Reciente</h5>
          </div>
          <div className="flex h-32 items-center justify-center text-gray-400 border border-dashed border-[#EBEBEB] dark:border-[#2A2A2A] rounded-xl">
            Lista de citas (Próximamente)
          </div>
        </div>
      </div>
    </div>
  );
}
