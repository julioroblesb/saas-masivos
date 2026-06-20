'use client';

import { useState } from 'react';
import { Megaphone, Users, Activity, History } from 'lucide-react';
import { CampaignSender } from './components/CampaignSender';
import { MarketingContactsManager } from './components/MarketingContactsManager';
import { CampaignProgressCard } from './components/CampaignProgressCard';
import { CampaignHistoryTable } from './components/CampaignHistoryTable';
import { useCampaigns } from '../../hooks/queries/useCampaigns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import './Campaigns.css';

export default function CampaignsView() {
  const [activeTab, setActiveTab] = useState('new');
  
  const { data: campaigns = [] } = useCampaigns();

  const activeCampaigns = campaigns.filter(c => ['queued', 'running', 'paused'].includes(c.status));
  const historyCampaigns = campaigns.filter(c => ['completed', 'cancelled'].includes(c.status));

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-2 p-1 justify-start">
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Megaphone size={16} /> Nueva Campaña
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Activity size={16} /> Activas 
            {activeCampaigns.length > 0 && (
              <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">
                {activeCampaigns.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History size={16} /> Historial
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users size={16} /> Base de Contactos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-0 outline-none">
          <CampaignSender />
        </TabsContent>
        
        <TabsContent value="active" className="mt-0 outline-none">
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
        </TabsContent>

        <TabsContent value="history" className="mt-0 outline-none">
          <div className="panel p-0 overflow-hidden">
            <CampaignHistoryTable campaigns={historyCampaigns} />
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-0 outline-none">
          <MarketingContactsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
