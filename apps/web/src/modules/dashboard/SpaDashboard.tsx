'use client';

import React from 'react';
import { motion, type Variants } from 'motion/react';
import dynamic from 'next/dynamic';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { 
  Users, 
  DollarSign, 
  MessageSquare, 
  Heart, 
  Clock, 
  Calendar,
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
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completado</span>;
      case 'en_curso':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">En curso</span>;
      case 'cancelado':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Evitar desfase de zona horaria al instanciar fechas solo con año-mes-día
    const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: dateStr.includes('T') ? '2-digit' : undefined,
      minute: dateStr.includes('T') ? '2-digit' : undefined,
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
    colors: ['#4f46e5'], // Indigo-600
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 100]
      }
    },
    xaxis: {
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: isDark ? '#9ca3af' : '#4b5563', fontSize: '12px' },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `S/ ${val.toFixed(0)}`,
        style: { colors: isDark ? '#9ca3af' : '#4b5563', fontSize: '12px' },
      },
    },
    grid: {
      borderColor: isDark ? '#374151' : '#e5e7eb',
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
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.4 } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >
      
      {/* Bento Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta Principal (Ingresos) */}
        <motion.div variants={item} className="md:col-span-2 relative flex flex-col justify-between rounded-3xl p-8 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Ingresos de Hoy</span>
              <span className="text-black dark:text-white text-5xl md:text-6xl font-black tracking-tight mt-2">
                {formatCurrency(metrics.revenue_today || 0)}
              </span>
            </div>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
          
          <div className="relative z-10 mt-12 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
            <span>Suma de servicios completados hoy</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> En tiempo real
            </span>
          </div>
        </motion.div>

        {/* Bloque Apilado Derecho (Métricas Secundarias) */}
        <div className="flex flex-col gap-6">
          {/* Atenciones de hoy */}
          <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 group">
            <div className="flex flex-col space-y-1">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Atenciones de Hoy</span>
              <span className="text-black dark:text-white text-4xl font-extrabold tracking-tight mt-1">{metrics.clients_today || 0}</span>
            </div>
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Calendar className="h-6 w-6" />
            </div>
          </motion.div>

          {/* Clientes Registrados */}
          <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 group">
            <div className="flex flex-col space-y-1">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Clientes (CRM)</span>
              <span className="text-black dark:text-white text-4xl font-extrabold tracking-tight mt-1">{metrics.total_clients || 0}</span>
            </div>
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 rounded-2xl text-blue-600 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fila de Mensajería */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Mensajes Automáticos (7d) */}
        <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 group">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Autocomunicaciones (7d)</span>
            <h4 className="text-black dark:text-white text-3xl font-extrabold tracking-tight mt-1">{metrics.auto_messages_7d || 0}</h4>
            <p className="text-xs text-zinc-400 mt-2">Mensajes enviados por el sistema</p>
          </div>
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/20 rounded-2xl text-purple-600 dark:text-purple-400">
            <MessageSquare className="h-6 w-6" />
          </div>
        </motion.div>

        {/* Mensajes en Cola */}
        <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 group">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Mensajes en Cola</span>
            <h4 className="text-black dark:text-white text-3xl font-extrabold tracking-tight mt-1">{metrics.pending_messages || 0}</h4>
            <p className="text-xs text-zinc-400 mt-2">Programados por enviar</p>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-2xl text-amber-600 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
        </motion.div>

        {/* Clientes Recuperados */}
        <motion.div variants={item} className="relative flex items-center justify-between rounded-3xl p-6 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-zinc-800 group">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">Clientes Recuperados</span>
            <h4 className="text-black dark:text-white text-3xl font-extrabold tracking-tight mt-1">{metrics.recovered_clients || 0}</h4>
            <p className="text-xs text-zinc-400 mt-2">Volvieron gracias a campañas/recordatorios</p>
          </div>
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 rounded-2xl text-rose-600 dark:text-rose-400">
            <Heart className="h-6 w-6" />
          </div>
        </motion.div>
      </div>

      {/* Fila Inferior - Gráficos e Historial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Gráfico de Ventas */}
        <motion.div variants={item} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">Rendimiento de Ventas (7 días)</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Ingresos brutos diarios en PEN (sólo servicios completados).</p>
          </div>
          <div className="min-h-[320px]">
            {chartData.length > 0 ? (
              <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={320} />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm">
                Sin datos suficientes para mostrar el gráfico
              </div>
            )}
          </div>
        </motion.div>

        {/* Actividad Reciente */}
        <motion.div variants={item} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 flex flex-col justify-between">
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-black dark:text-white">Atenciones Recientes</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Últimas 5 atenciones registradas en el sistema.</p>
              </div>
              <Link href="/dashboard/atenciones" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              {recentActivity.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-semibold text-xs uppercase tracking-wider">
                      <th className="pb-3">Paciente</th>
                      <th className="pb-3">Servicio</th>
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3 text-right">Monto</th>
                      <th className="pb-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {recentActivity.map((visit) => (
                      <tr key={visit.id} className="text-zinc-700 dark:text-zinc-300">
                        <td className="py-3 font-medium text-black dark:text-white">
                          <div className="flex flex-col">
                            <span>{visit.contact_name || 'Sin nombre'}</span>
                            <span className="text-[10px] text-zinc-400">{visit.contact_phone}</span>
                          </div>
                        </td>
                        <td className="py-3 text-xs">{visit.service_name}</td>
                        <td className="py-3 text-xs">{formatDate(visit.visit_date)}</td>
                        <td className="py-3 text-right font-semibold text-xs">{formatCurrency(visit.price_charged || 0)}</td>
                        <td className="py-3 text-center">{getStatusBadge(visit.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-64 items-center justify-center text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm">
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
