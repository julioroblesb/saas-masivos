// Spa Service (catálogo)
export interface SpaService {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  price: number;
  min_price?: number;
  promo_price?: number;
  duration_days: number;
  care_instructions?: string;
  care_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Spa Product (catálogo)
export interface SpaProduct {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Spa Visit (atención)
export interface SpaVisit {
  id: string;
  company_id: string;
  contact_id: string;
  service_id: string;
  status: 'en_curso' | 'completado' | 'cancelado';
  visit_date: string;
  completed_at?: string;
  notes?: string;
  price_charged?: number;
  follow_up_date?: string;
  follow_up_sent: boolean;
  care_sent: boolean;
  created_at: string;
  // Joined fields
  contact_name?: string;
  contact_phone?: string;
  service_name?: string;
  service_price?: number;
}

// Spa Follow-up (mensaje automático programado)
export interface SpaFollowUp {
  id: string;
  company_id: string;
  visit_id?: string;
  contact_id: string;
  type: 'care' | 'follow_up' | 'birthday';
  phone: string;
  message: string;
  media_url?: string;
  scheduled_for: string;
  status: 'pendiente' | 'encolado' | 'enviado' | 'fallido';
  sent_at?: string;
  created_at: string;
}

// Spa Client Metrics
export interface SpaClientMetrics {
  id: string;
  phone: string;
  name: string;
  email?: string;
  birthday?: string;
  notes?: string;
  is_archived: boolean;
  created_at: string;
  campaigns_count: number;
  last_message_sent_at?: string;
  last_reply_at?: string;
  total_visits: number;
  last_visit_at?: string;
  last_service_name?: string;
}

// Dashboard metrics
export interface SpaDashboardMetrics {
  autoMessages7d: number;
  recoveredClients: number;
}

// Auto message settings (stored in companies.settings.auto_messages)
export interface AutoMessageSettings {
  careEnabled: boolean;
  careTemplate: string;
  followUpEnabled: boolean;
  followUpTemplate: string;
  birthdayEnabled: boolean;
  birthdayTemplate: string;
}
