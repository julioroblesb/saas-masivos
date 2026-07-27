import type { Tables } from '@/types/database.generated';

export type AtencionService = Tables<'spa_services'>;

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

export type AtencionContact = FullClientProfileData;

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
  crm_marketing_contacts?: FullClientProfileData | null;
};

export type AgendaVisit = AtencionVisit & {
  crm_marketing_contacts?: FullClientProfileData | null;
  spa_services?: { name: string; price: number } | null;
};
