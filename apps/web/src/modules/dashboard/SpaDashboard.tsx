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

  const cards = [
    {
      title: 'Clientes Hoy',
      value: metrics.clients_today || 0,
      icon: <IconUsers className="h-8 w-8 text-white" />,
      bg: 'bg-gradient-to-r from-cyan-500 to-blue-500',
      shadow: 'shadow-[0_4px_15px_rgba(6,182,212,0.3)]'
    },
    {
      title: 'Ingresos Hoy',
      value: formatCurrency(metrics.revenue_today || 0),
      icon: <IconDollarSignCircle className="h-8 w-8 text-white" />,
      bg: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      shadow: 'shadow-[0_4px_15px_rgba(16,185,129,0.3)]'
    },
    {
      title: 'Mensajes Auto (7d)',
      value: metrics.auto_messages_7d || 0,
      icon: <IconMessage2 className="h-8 w-8 text-white" />,
      bg: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      shadow: 'shadow-[0_4px_15px_rgba(168,85,247,0.3)]'
    },
    {
      title: 'Clientes Recuperados',
      value: metrics.recovered_clients || 0,
      icon: <IconHeart className="h-8 w-8 text-white" />,
      bg: 'bg-gradient-to-r from-rose-500 to-pink-500',
      shadow: 'shadow-[0_4px_15px_rgba(244,63,94,0.3)]'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            className={`relative flex items-center justify-between rounded-xl p-6 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02] ${card.bg} ${card.shadow} overflow-hidden group`}
          >
            {/* Glassmorphism subtle overlay */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10 flex flex-col space-y-2">
              <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">{card.title}</span>
              <span className="text-white text-3xl font-bold tracking-tight">{card.value}</span>
            </div>
            
            <div className="relative z-10 p-3 bg-white/20 rounded-full backdrop-blur-sm">
              {card.icon}
            </div>

            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="rounded-xl border border-white-light bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] dark:border-[#1b2e4b] dark:bg-black/50 backdrop-blur-md">
          <div className="mb-5 flex items-center justify-between">
            <h5 className="text-lg font-semibold dark:text-white-light">Actividad Reciente</h5>
          </div>
          <div className="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
            Gráfico en construcción...
          </div>
        </div>

        <div className="rounded-xl border border-white-light bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] dark:border-[#1b2e4b] dark:bg-black/50 backdrop-blur-md">
          <div className="mb-5 flex items-center justify-between">
            <h5 className="text-lg font-semibold dark:text-white-light">Próximas Citas</h5>
          </div>
          <div className="flex h-48 items-center justify-center text-gray-500 dark:text-gray-400">
            Lista en construcción...
          </div>
        </div>
      </div>
    </div>
  );
}
