'use client';

import { useState } from 'react';
import { Megaphone, Activity, History } from 'lucide-react';
import { CampaignSender } from './components/CampaignSender';
import { CampaignProgressCard } from './components/CampaignProgressCard';
import { CampaignHistoryTable } from './components/CampaignHistoryTable';
import { useCampaigns } from '../../hooks/queries/useCampaigns';

export default function CampaignsView() {
  const [activeTab, setActiveTab] = useState('new');
  
  const { data: campaigns = [] } = useCampaigns();

  const activeCampaigns = campaigns.filter(c => ['queued', 'running', 'paused'].includes(c.status));
  const historyCampaigns = campaigns.filter(c => ['completed', 'cancelled'].includes(c.status));

  return (
    <section className="overflow-hidden rounded-2xl border border-black-light bg-white dark:border-dark-light dark:bg-dark">
      <div className="grid grid-cols-3 border-b border-black-light/50 dark:border-dark-light" role="tablist" aria-label="Secciones de campañas">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'new'}
          className={`flex min-h-11 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-sm font-semibold transition-[color,border-color,background-color] duration-200 sm:gap-2 sm:px-4 ${
            activeTab === 'new' ? 'border-primary text-primary' : 'border-transparent text-muted hover:border-black-light dark:hover:border-dark-light'
          }`}
          onClick={() => setActiveTab('new')}
        >
          <Megaphone size={17} aria-hidden="true" />
          <span className="sm:hidden">Nueva</span>
          <span className="hidden sm:inline">Nueva campaña</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'active'}
          className={`flex min-h-11 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-sm font-semibold transition-[color,border-color,background-color] duration-200 sm:gap-2 sm:px-4 ${
            activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-muted hover:border-black-light dark:hover:border-dark-light'
          }`}
          onClick={() => setActiveTab('active')}
        >
          <Activity size={17} aria-hidden="true" /> Activas
          {activeCampaigns.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] text-white">
              {activeCampaigns.length}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`flex min-h-11 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-sm font-semibold transition-[color,border-color,background-color] duration-200 sm:gap-2 sm:px-4 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted hover:border-black-light dark:hover:border-dark-light'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History size={17} aria-hidden="true" /> Historial
        </button>

      </div>

      {/* Tab Contents */}
      <div className="p-4 sm:p-6 lg:p-8">
        {activeTab === 'new' && (
          <CampaignSender />
        )}
        
        {activeTab === 'active' && (
          <div className="flex flex-col gap-6">
            {activeCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity size={40} className="mb-4 text-muted" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-ink dark:text-white-light mb-2">No hay campañas activas</h3>
                <p className="text-muted mb-6 text-center">Las campañas en proceso de envío aparecerán aquí.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('new')}
                >
                  Crear nueva campaña
                </button>
              </div>
            ) : (
              activeCampaigns.map(campaign => (
                <CampaignProgressCard key={campaign.id} campaign={campaign} />
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-hidden">
            <CampaignHistoryTable campaigns={historyCampaigns} />
          </div>
        )}
      </div>
    </section>
  );
}
