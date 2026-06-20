'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, CheckCircle, XCircle, Battery, Wifi, Smartphone } from 'lucide-react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export function TenantDashboard() {
  const isDark = useSelector((state: IRootState) => state.themeConfig.isDarkMode);
  
  // Datos estáticos (Mock) mientras conectamos con base de datos real
  const stats = {
    connected: true,
    battery: 85,
    phone: '+51 987 654 321',
    sentToday: 1450,
    failedToday: 12,
    queued: 340,
  };

  const chartOptions: any = {
    chart: {
      height: 300,
      type: 'area',
      fontFamily: 'Nunito, sans-serif',
      toolbar: { show: false },
      background: 'transparent',
    },
    colors: ['#00ab55', '#e7515a'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: isDark ? '#888ea8' : '#3b3f5c' },
      },
    },
    yaxis: {
      labels: {
        style: { colors: isDark ? '#888ea8' : '#3b3f5c' },
      },
    },
    grid: {
      borderColor: isDark ? '#191e3a' : '#e0e6ed',
      strokeDashArray: 4,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    theme: { mode: isDark ? 'dark' : 'light' }
  };

  const chartSeries = [
    { name: 'Exitosos', data: [1200, 1500, 800, 2000, 1800, 500, 1450] },
    { name: 'Fallidos', data: [15, 20, 5, 25, 10, 2, 12] },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="panel flex items-center justify-between">
          <div>
            <h6 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Estado WhatsApp</h6>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stats.connected ? 'bg-success' : 'bg-danger'} animate-pulse`}></span>
              <span className="text-lg font-semibold">{stats.connected ? 'Conectado' : 'Desconectado'}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <div className="flex items-center gap-1" title="Batería del dispositivo"><Battery size={14} className="text-success" /> {stats.battery}%</div>
              <div className="flex items-center gap-1" title="Número vinculado"><Smartphone size={14} /> {stats.phone}</div>
            </div>
          </div>
          <div className="p-3 bg-success/10 rounded-full text-success">
            <Wifi size={24} />
          </div>
        </div>

        {/* Sent Today */}
        <div className="panel flex items-center justify-between">
          <div>
            <h6 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Enviados (Hoy)</h6>
            <span className="text-2xl font-bold">{stats.sentToday}</span>
            <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
              <span className="text-success flex items-center gap-0.5"><CheckCircle size={12}/> Entregados</span>
            </div>
          </div>
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <MessageSquare size={24} />
          </div>
        </div>

        {/* Failed Today */}
        <div className="panel flex items-center justify-between">
          <div>
            <h6 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Fallidos (Hoy)</h6>
            <span className="text-2xl font-bold">{stats.failedToday}</span>
            <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
              <span className="text-danger flex items-center gap-0.5"><XCircle size={12}/> Números Inválidos</span>
            </div>
          </div>
          <div className="p-3 bg-danger/10 rounded-full text-danger">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      <div className="panel h-full">
        <div className="flex items-center justify-between mb-5">
          <h5 className="font-semibold text-lg dark:text-white-light">Volumen de Envío (Últimos 7 Días)</h5>
        </div>
        <div>
          <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={300} />
        </div>
      </div>
    </div>
  );
}
