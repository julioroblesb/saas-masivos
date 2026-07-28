'use client';

import { useState, useMemo } from 'react';
import { CreateTenantForm } from './CreateTenantForm';
import { RealClientsView, type ExtendedCompany } from './RealClientsView';
import { DemoAccountsView } from './DemoAccountsView';
import { WhatsappOversightView, type ExtendedWaSession } from './WhatsappOversightView';
import {
  Building2,
  Users,
  Activity,
  UserPlus,
  Smartphone,
  FlaskConical,
  Clock,
} from 'lucide-react';
import { evaluateTenantAccess } from '@/domain/subscriptions/evaluate-tenant-access';

interface AdminDashboardClientProps {
  companies: ExtendedCompany[];
  waSessions: ExtendedWaSession[];
}

type ActiveTab = 'real_clients' | 'demo_accounts' | 'whatsapp';

export function AdminDashboardClient({ companies, waSessions }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('real_clients');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Compute Metrics strictly according to requirements
  const realClientsCount = useMemo(
    () => companies.filter((c) => c.is_demo !== true).length,
    [companies],
  );

  const activeRealClientsCount = useMemo(
    () => companies.filter((c) => c.is_demo !== true && evaluateTenantAccess(c).allowed).length,
    [companies],
  );

  const demoAccountsCount = useMemo(
    () => companies.filter((c) => c.is_demo === true).length,
    [companies],
  );

  const connectedWaCount = useMemo(
    () => waSessions.filter((s) => s.status === 'conectado').length,
    [waSessions],
  );

  const pendingWaCount = useMemo(
    () =>
      waSessions.filter((s) => s.status === 'esperando_qr' || s.status === 'generando_qr').length,
    [waSessions],
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Panel de Administración SuperAdmin
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gestión separada de clientes reales, cuentas demo y monitoreo operativo de WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-primary hover:bg-primary/90 shadow-sm transition-colors"
        >
          <UserPlus className="size-4" />
          {isFormOpen ? 'Cerrar formulario' : 'Añadir Nuevo Cliente'}
        </button>
      </div>

      {/* Optional Drawer / Collapse for Add Client Form */}
      {isFormOpen && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <UserPlus className="size-5 text-primary" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Registrar Nuevo Cliente / Tenant
            </h3>
          </div>
          <CreateTenantForm />
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Clientes Reales */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Clientes Reales
            </p>
            <h4 className="text-2xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">
              {realClientsCount}
            </h4>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Building2 className="size-6" />
          </div>
        </div>

        {/* Clientes Reales Activos */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Reales Activos
            </p>
            <h4 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {activeRealClientsCount}
            </h4>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Activity className="size-6" />
          </div>
        </div>

        {/* Cuentas Demo */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Cuentas Demo
            </p>
            <h4 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {demoAccountsCount}
            </h4>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <FlaskConical className="size-6" />
          </div>
        </div>

        {/* WhatsApp Conectados + Pending Badge */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              WhatsApp Conectados
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="text-2xl font-bold text-green-600 dark:text-green-400">
                {connectedWaCount}
              </h4>
              {pendingWaCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="size-3" />
                  {pendingWaCount} pend.
                </span>
              )}
            </div>
          </div>
          <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
            <Smartphone className="size-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs del panel de administración">
          <button
            type="button"
            onClick={() => setActiveTab('real_clients')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === 'real_clients'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="size-4" />
            <span>Clientes reales ({realClientsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('demo_accounts')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === 'demo_accounts'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <FlaskConical className="size-4" />
            <span>Cuentas demo ({demoAccountsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Smartphone className="size-4" />
            <span>WhatsApp ({connectedWaCount} conectados)</span>
          </button>
        </nav>
      </div>

      {/* Active Tab View */}
      <div className="pt-2">
        {activeTab === 'real_clients' && <RealClientsView companies={companies} />}
        {activeTab === 'demo_accounts' && <DemoAccountsView companies={companies} />}
        {activeTab === 'whatsapp' && (
          <WhatsappOversightView sessions={waSessions} companies={companies} />
        )}
      </div>
    </div>
  );
}
