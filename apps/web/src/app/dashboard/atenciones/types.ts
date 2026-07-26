import type { Tables } from '@/types/database.generated';

export type AtencionService = Tables<'spa_services'>;

export type AtencionContact = Pick<
  Tables<'crm_marketing_contacts'>,
  'document_number' | 'email' | 'id' | 'name' | 'phone'
>;

export interface AtencionStaff {
  id: string;
  isActive: boolean;
  name: string;
  role: string | null;
  services: string[];
}

export type AtencionVisit = Tables<'spa_visits'> & {
  amount_paid?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  service_name?: string | null;
};

export type AgendaVisit = AtencionVisit & {
  crm_marketing_contacts?: {
    created_at?: string | null;
    email?: string | null;
    name: string | null;
    phone: string;
    source?: string | null;
  } | null;
  spa_services?: { name: string; price: number } | null;
};
