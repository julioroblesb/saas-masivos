'use client';

import React, { useState } from 'react';
import { Phone, AlertTriangle, Heart, Clock, Coins } from 'lucide-react';
import { formatBusinessDateTime } from '@/lib/business-date';
import { ClientProfileModal, FullClientProfileData } from './ClientProfileModal';

interface ClientProfilePopoverProps {
  client?: FullClientProfileData | null;
  pendingBalance?: number;
  className?: string;
}

export function ClientProfileInteractiveName({
  client,
  pendingBalance,
  className = '',
}: ClientProfilePopoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!client) {
    return <span className="font-semibold text-black dark:text-white">Sin cliente</span>;
  }

  const nameText = client.name || 'Sin nombre';
  const allergies = client.allergies_and_conditions || 'No registrado';
  const preferences = client.preferences || 'No registrado';
  const lastVisit = client.last_visit_date || client.last_visit_at;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <>
      <div
        className="relative inline-block group/client-name"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={handleClick}
          className={`font-bold text-ink dark:text-white-light hover:text-primary dark:hover:text-primary transition-colors text-left focus:outline-none underline decoration-dashed underline-offset-4 decoration-primary/40 hover:decoration-primary cursor-pointer ${className}`}
        >
          {nameText}
        </button>

        {/* Hover Popover Preview for Desktop */}
        {isHovered && (
          <div
            className="hidden md:block absolute left-0 bottom-full mb-2 w-72 p-4 bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-black-light dark:border-dark-light pb-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {nameText.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="font-bold text-sm text-black dark:text-white truncate">{nameText}</div>
                <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-primary shrink-0" /> +{client.phone || 'No registrado'}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {/* Allergies Highlighted */}
              <div className="p-2 rounded-xl bg-danger/10 border border-danger/20 text-danger dark:text-red-400">
                <div className="font-bold flex items-center gap-1 text-[10px] uppercase tracking-wider mb-0.5">
                  <AlertTriangle className="w-3 h-3" /> Alergias / Salud:
                </div>
                <div className="font-medium truncate">{allergies}</div>
              </div>

              <div className="text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold text-zinc-400 flex items-center gap-1 text-[10px] uppercase tracking-wider mb-0.5">
                  <Heart className="w-3 h-3 text-primary" /> Preferencias:
                </span>
                <span className="line-clamp-2">{preferences}</span>
              </div>

              <div className="text-zinc-600 dark:text-zinc-300 pt-1">
                <span className="font-semibold text-zinc-400 flex items-center gap-1 text-[10px] uppercase tracking-wider mb-0.5">
                  <Clock className="w-3 h-3 text-primary" /> Última Visita:
                </span>
                <span>{lastVisit ? formatBusinessDateTime(lastVisit) : 'No registrado'}</span>
              </div>

              {pendingBalance !== undefined && pendingBalance > 0 && (
                <div className="pt-2 border-t border-black-light dark:border-dark-light flex justify-between items-center text-danger font-bold">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Coins className="w-3.5 h-3.5" /> Saldo Pendiente:
                  </span>
                  <span>S/ {pendingBalance}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Modal */}
      <ClientProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={client}
      />
    </>
  );
}
