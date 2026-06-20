'use client';

import { useState } from 'react';
import { Megaphone, Users, Activity, History } from 'lucide-react';
import { CampaignSender } from './components/CampaignSender';
import { MarketingContactsManager } from './components/MarketingContactsManager';
import { CampaignProgressCard } from './components/CampaignProgressCard';
import { CampaignHistoryTable } from './components/CampaignHistoryTable';
import { useCampaigns } from '../../hooks/queries/useCampaigns';
import './Campaigns.css';

export default function CampaignsView() {
  const [activeTab, setActiveTab] = useState('new');
  
  const { data: campaigns = [] } = useCampaigns();

  const activeCampaigns = campaigns.filter(c => ['queued', 'running', 'paused'].includes(c.status));
  const historyCampaigns = campaigns.filter(c => ['completed', 'cancelled'].includes(c.status));

  return (
    <div className="space-y-6">
      {/* Vristo style tabs */}
      <div className="mb-5 flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
        <button
          className={`flex items-center gap-2 p-4 py-3 hover:text-primary transition-all border-b-2 ${
            activeTab === 'new' ? 'border-primary text-primary' : 'border-transparent text-white-dark hover:border-white-light dark:hover:border-[#191e3a]'
          }`}
          onClick={() => setActiveTab('new')}
        >
          <Megaphone size={18} /> Nueva Campaña
        </button>

        <button
          className={`flex items-center gap-2 p-4 py-3 hover:text-primary transition-all border-b-2 ${
            activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-white-dark hover:border-white-light dark:hover:border-[#191e3a]'
          }`}
          onClick={() => setActiveTab('active')}
        >
          <Activity size={18} /> Activas 
          {activeCampaigns.length > 0 && (
            <span className="badge bg-indigo-500 rounded-full ml-1 px-2 py-0.5 text-white">
              {activeCampaigns.length}
            </span>
          )}
        </button>

        <button
          className={`flex items-center gap-2 p-4 py-3 hover:text-primary transition-all border-b-2 ${
            activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-white-dark hover:border-white-light dark:hover:border-[#191e3a]'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} /> Historial
        </button>

        <button
          className={`flex items-center gap-2 p-4 py-3 hover:text-primary transition-all border-b-2 ${
            activeTab === 'contacts' ? 'border-primary text-primary' : 'border-transparent text-white-dark hover:border-white-light dark:hover:border-[#191e3a]'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          <Users size={18} /> Base de Contactos
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-0">
        {activeTab === 'new' && (
          <CampaignSender />
        )}
        
        {activeTab === 'active' && (
          <div className="flex flex-col gap-6">
            {activeCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 panel">
                <Activity size={48} className="text-white-dark mb-4" />
                <h3 className="text-lg font-semibold text-dark dark:text-white-light mb-2">No hay campañas activas</h3>
                <p className="text-white-dark mb-6 text-center">Las campañas en proceso de envío aparecerán aquí.</p>
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
          <div className="panel p-0 overflow-hidden">
            <CampaignHistoryTable campaigns={historyCampaigns} />
          </div>
        )}

        {activeTab === 'contacts' && (
          <MarketingContactsManager />
        )}
      </div>
    </div>
  );
}
