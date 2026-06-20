'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface TenantDashboardProps {
  waStatus: boolean;
  waPhone: string;
  sentToday: number;
  failedToday: number;
  chartData: {
    exitosos: number[];
    fallidos: number[];
    categorias: string[];
  };
  conversionRate?: number;
  totalReplies?: number;
}

export function TenantDashboard({ waStatus, waPhone, sentToday, failedToday, chartData, conversionRate = 0, totalReplies = 0 }: TenantDashboardProps) {
  const isDark = useSelector((state: IRootState) => state.themeConfig.isDarkMode);

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
      categories: chartData.categorias,
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
    { name: 'Exitosos', data: chartData.exitosos },
    { name: 'Fallidos', data: chartData.fallidos },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Sent Today */}
        <div className="panel flex items-center justify-between">
          <div>
            <h6 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Enviados (Hoy)</h6>
            <span className="text-2xl font-bold">{sentToday}</span>
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
            <span className="text-2xl font-bold">{failedToday}</span>
            <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
              <span className="text-danger flex items-center gap-0.5"><XCircle size={12}/> Errores</span>
            </div>
          </div>
          <div className="p-3 bg-danger/10 rounded-full text-danger">
            <XCircle size={24} />
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="panel flex items-center justify-between">
          <div>
            <h6 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Conversión Respuestas</h6>
            <span className="text-2xl font-bold">{conversionRate}%</span>
            <div className="mt-3 text-sm text-gray-500 flex items-center gap-1">
              <span className="text-info flex items-center gap-0.5"><MessageSquare size={12}/> {totalReplies} respuestas</span>
            </div>
          </div>
          <div className="p-3 bg-info/10 rounded-full text-info">
            <MessageSquare size={24} />
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
