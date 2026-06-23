'use client';

import React from 'react';
import { motion, type Variants } from 'motion/react';
import dynamic from 'next/dynamic';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SpaDashboardProps {
  metrics: {
    clients_today: number;
    revenue_today: number;
    auto_messages_7d: number;
    recovered_clients: number;
    total_clients: number;
    pending_messages: number;
  };
  recentActivity: Array<{
    id: string;
    contact_name: string;
    contact_phone: string;
    service_name: string;
    price_charged: number;
    status: string;
    visit_date: string;
  }>;
  chartData: Array<{
    date: string;
    revenue: number;
    visits: number;
  }>;
}

export function SpaDashboard({ metrics, recentActivity = [], chartData = [] }: SpaDashboardProps) {
  const isDark = useSelector((state: IRootState) => state.themeConfig.isDarkMode);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completado':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500">Completado</span>;
      case 'en_curso':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500">En curso</span>;
      case 'cancelado':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-500">Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-zinc-500/10 text-zinc-400">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const isDateOnly = !dateStr.includes('T') || dateStr.includes('T00:00:00');
    if (isDateOnly) {
      const cleanDateStr = dateStr.split('T')[0];
      const date = new Date(cleanDateStr + 'T00:00:00');
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Preparar datos del gráfico
  const categories = chartData.map((d: any) => {
    const date = new Date(d.date + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });
  const revenueSeries = chartData.map((d: any) => parseFloat(d.revenue) || 0);

  const chartOptions: any = {
    chart: {
      height: 320,
      type: 'area',
      fontFamily: 'Nunito, sans-serif',
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: ['#E11D48'], // Vibrant Rose Pop
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.25,
        opacityTo: 0.01,
        stops: [0, 100]
      }
    },
    xaxis: {
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: isDark ? '#A1A1AA' : '#506690', fontSize: '11px' },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `S/ ${val.toFixed(0)}`,
        style: { colors: isDark ? '#A1A1AA' : '#506690', fontSize: '11px' },
      },
    },
    grid: {
      borderColor: isDark ? '#27272A' : '#E4E4E7',
      strokeDashArray: 4,
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val: number) => `S/ ${val.toFixed(2)}`
      }
    },
    theme: { mode: isDark ? 'dark' : 'light' }
  };

  const chartSeries = [
    { name: 'Ingresos', data: revenueSeries },
  ];

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
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.35 } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-8"
    >
      
      {/* Sección 1: Fila de Métricas Tipográficas (Sin Cards) */}
      <motion.div 
        variants={item} 
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 py-8 border-y border-black-light dark:border-dark-light"
      >
        {/* Ingresos de Hoy */}
        <div className="flex flex-col space-y-1.5">
          <span className="text-white-dark text-xs font-bold uppercase tracking-wider">Ingresos de Hoy</span>
          <span className="text-black dark:text-white text-3xl font-black tracking-tight">
            {formatCurrency(metrics.revenue_today || 0)}
          </span>
          <span className="text-[10px] text-white-dark flex items-center gap-1 font-medium">
            <Sparkles className="h-3 w-3 text-emerald-500" /> Tiempo real
          </span>
        </div>

        {/* Atenciones de Hoy */}
        <div className="flex flex-col space-y-1.5 lg:border-l lg:border-black-light/40 dark:lg:border-dark-light/40 lg:pl-6">
          <span className="text-white-dark text-xs font-bold uppercase tracking-wider">Atenciones de Hoy</span>
          <span className="text-black dark:text-white text-3xl font-black tracking-tight">
            {metrics.clients_today || 0}
          </span>
          <span className="text-[10px] text-white-dark font-medium">Citas programadas</span>
        </div>

        {/* Clientes Registrados */}
        <div className="flex flex-col space-y-1.5 sm:border-l sm:border-black-light/40 dark:sm:border-dark-light/40 sm:pl-6">
          <span className="text-white-dark text-xs font-bold uppercase tracking-wider">Clientes (CRM)</span>
          <span className="text-black dark:text-white text-3xl font-black tracking-tight">
            {metrics.total_clients || 0}
          </span>
          <span className="text-[10px] text-white-dark font-medium">Base de datos activa</span>
        </div>

        {/* Autocomunicaciones (7d) */}
        <div className="flex flex-col space-y-1.5 lg:border-l lg:border-black-light/40 dark:lg:border-dark-light/40 lg:pl-6">
          <span className="text-white-dark text-xs font-bold uppercase tracking-wider">Comunicaciones (7d)</span>
          <span className="text-black dark:text-white text-3xl font-black tracking-tight">
            {metrics.auto_messages_7d || 0}
          </span>
          <span className="text-[10px] text-white-dark font-medium">Mensajes enviados</span>
        </div>

        {/* Mensajes en Cola */}
        <div className="flex flex-col space-y-1.5 sm:border-l sm:border-black-light/40 dark:sm:border-dark-light/40 sm:pl-6">
          <span className="text-white-dark text-xs font-bold uppercase tracking-wider">Mensajes en Cola</span>
          <span className="text-black dark:text-white text-3xl font-black tracking-tight">
            {metrics.pending_messages || 0}
          </span>
          <span className="text-[10px] text-white-dark font-medium">Pendientes de salida</span>
        </div>

        {/* Clientes Recuperados */}
        <div className="flex flex-col space-y-1.5 lg:border-l lg:border-black-light/40 dark:lg:border-dark-light/40 lg:pl-6">
          <span className="text-white-dark text-xs font-bold uppercase tracking-wider">Recuperados</span>
          <span className="text-black dark:text-white text-3xl font-black tracking-tight">
            {metrics.recovered_clients || 0}
          </span>
          <span className="text-[10px] text-white-dark font-medium">Clientes reactivados</span>
        </div>
      </motion.div>

      {/* Sección 2: Espacio de Trabajo Unificado (Chart y Tabla) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
        
        {/* Columna Izquierda: Gráfico de Ventas */}
        <motion.div variants={item} className="lg:col-span-7 space-y-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">Rendimiento de Ventas</h3>
            <p className="text-xs text-white-dark mt-1">Ingresos brutos diarios en PEN (sólo servicios completados en los últimos 7 días).</p>
          </div>
          <div className="min-h-[320px] pt-4">
            {chartData.length > 0 ? (
              <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={320} />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-white-dark border border-dashed border-black-light dark:border-dark-light rounded-2xl text-sm">
                Sin datos suficientes para mostrar el gráfico
              </div>
            )}
          </div>
        </motion.div>

        {/* Columna Derecha: Atenciones Recientes */}
        <motion.div variants={item} className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-black dark:text-white">Atenciones Recientes</h3>
                <p className="text-xs text-white-dark mt-1">Las últimas 5 visitas registradas en la plataforma.</p>
              </div>
              <Link href="/dashboard/atenciones" className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="overflow-x-auto mt-6">
              {recentActivity.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black-light dark:border-dark-light text-white-dark font-semibold text-xs uppercase tracking-wider">
                      <th className="pb-3">Paciente</th>
                      <th className="pb-3">Servicio</th>
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3 text-right">Monto</th>
                      <th className="pb-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black-light/30 dark:divide-dark-light/20">
                    {recentActivity.map((visit) => (
                      <tr key={visit.id} className="text-zinc-700 dark:text-zinc-300">
                        <td className="py-3.5 font-medium text-black dark:text-white">
                          <div className="flex flex-col">
                            <span>{visit.contact_name || 'Sin nombre'}</span>
                            <span className="text-[10px] text-white-dark font-normal">{visit.contact_phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-xs">{visit.service_name}</td>
                        <td className="py-3.5 text-xs">{formatDate(visit.visit_date)}</td>
                        <td className="py-3.5 text-right font-semibold text-xs">{formatCurrency(visit.price_charged || 0)}</td>
                        <td className="py-3.5 text-center">{getStatusBadge(visit.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-64 items-center justify-center text-white-dark border border-dashed border-black-light dark:border-dark-light rounded-2xl text-sm">
                  Aún no has registrado ninguna atención
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
