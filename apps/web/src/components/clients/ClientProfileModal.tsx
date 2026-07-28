'use client';

import React from 'react';
import {
  XCircle,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  AlertTriangle,
  Heart,
  Clock,
  Share2,
} from 'lucide-react';
import { formatDateOnly, formatBusinessDateTime } from '@/lib/business-date';
import type { Tables } from '@/types/database.generated';

export type FullClientProfileData = Partial<Tables<'crm_marketing_contacts'>> & {
  id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  document_number?: string | null;
  birthday?: string | null;
  allergies_and_conditions?: string | null;
  preferences?: string | null;
  internal_notes?: string | null;
  created_at?: string | null;
  opt_in_source?: string | null;
  customer_segment?: string | null;
  total_visits?: number | null;
  total_spent?: number | null;
  last_visit_date?: string | null;
  last_visit_at?: string | null;
};

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client?: FullClientProfileData | null;
}

export function ClientProfileModal({ isOpen, onClose, client }: ClientProfileModalProps) {
  if (!isOpen || !client) return null;

  const displayVal = (val: string | number | null | undefined, formatter?: (v: string) => string) => {
    if (val === null || val === undefined || val === '') return 'No registrado';
    if (formatter && typeof val === 'string') return formatter(val);
    return String(val);
  };

  const lastVisit = client.last_visit_date || client.last_visit_at;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 py-4 sm:py-6 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-profile-title"
        className="bg-white dark:bg-dark border border-black-light dark:border-dark-light rounded-3xl w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black-light dark:border-dark-light shrink-0 bg-gradient-to-r from-primary/5 via-white to-transparent dark:from-primary/10 dark:via-dark dark:to-dark">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {client.name?.charAt(0)?.toUpperCase() || <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 id="client-profile-title" className="text-2xl font-bold tracking-tight text-black dark:text-white leading-tight">
                {client.name || 'Sin nombre'}
              </h3>
              <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5 font-medium">
                <span>+{client.phone || 'Sin teléfono'}</span>
                {client.customer_segment && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider text-xs">
                    {client.customer_segment}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar perfil de cliente"
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"
            onClick={onClose}
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 min-h-0 overflow-y-auto">
          {/* Highlighted Medical Conditions & Allergies */}
          <div className="rounded-2xl p-4 bg-danger/10 border-2 border-danger/30 dark:bg-danger/20 dark:border-danger/40 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-danger dark:text-red-400 font-bold text-sm uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              Alergias y Condiciones Médicas
            </div>
            <p className="text-sm font-semibold text-black dark:text-white pl-7 leading-relaxed">
              {displayVal(client.allergies_and_conditions)}
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-black-light/50 dark:border-dark-light p-3 rounded-2xl flex flex-col items-center text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Visitas</span>
              <span className="text-xl font-extrabold text-black dark:text-white mt-1">
                {client.total_visits ?? 0}
              </span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-black-light/50 dark:border-dark-light p-3 rounded-2xl flex flex-col items-center text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">LTV (Gastado)</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                S/ {client.total_spent ?? 0}
              </span>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-black-light/50 dark:border-dark-light p-3 rounded-2xl flex flex-col items-center text-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Segmento</span>
              <span className="text-sm font-bold text-primary mt-1">
                {displayVal(client.customer_segment)}
              </span>
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-primary" /> Teléfono
              </label>
              <div className="text-sm font-medium text-black dark:text-white">
                +{displayVal(client.phone)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-primary" /> Correo Electrónico
              </label>
              <div className="text-sm font-medium text-black dark:text-white truncate">
                {displayVal(client.email)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> DNI / Documento
              </label>
              <div className="text-sm font-medium text-black dark:text-white">
                {displayVal(client.document_number)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Cumpleaños
              </label>
              <div className="text-sm font-medium text-black dark:text-white">
                {displayVal(client.birthday, formatDateOnly)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Cliente Desde
              </label>
              <div className="text-sm font-medium text-black dark:text-white">
                {displayVal(client.created_at, formatDateOnly)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-primary" /> Canal de Origen
              </label>
              <div className="text-sm font-semibold text-primary">
                {displayVal(client.opt_in_source)}
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Última Visita
              </label>
              <div className="text-sm font-medium text-black dark:text-white">
                {displayVal(lastVisit, formatBusinessDateTime)}
              </div>
            </div>
          </div>

          {/* Preferences & Internal Notes */}
          <div className="space-y-4 pt-4 border-t border-black-light dark:border-dark-light">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-primary" /> Preferencias del Cliente
              </label>
              <div className="text-sm font-normal text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-black-light/30 dark:border-dark-light">
                {displayVal(client.preferences)}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" /> Notas Internas (Staff)
              </label>
              <div className="text-sm font-normal text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-black-light/30 dark:border-dark-light">
                {displayVal(client.internal_notes)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-black-light dark:border-dark-light flex justify-end shrink-0">
          <button
            type="button"
            className="btn btn-primary rounded-xl px-8"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
