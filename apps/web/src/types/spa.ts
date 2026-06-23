// Spa Service (catálogo)
export interface SpaService {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  price: number;
  minPrice?: number;
  promoPrice?: number;
  durationDays: number;
  careInstructions?: string;
  careImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Spa Product (catálogo)
export interface SpaProduct {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Spa Visit (atención)
export interface SpaVisit {
  id: string;
  companyId: string;
  contactId: string;
  serviceId: string;
  status: 'en_curso' | 'completado' | 'cancelado';
  visitDate: string;
  completedAt?: string;
  notes?: string;
  priceCharged?: number;
  followUpDate?: string;
  followUpSent: boolean;
  careSent: boolean;
  createdAt: string;
  // Joined fields
  contactName?: string;
  contactPhone?: string;
  serviceName?: string;
  servicePrice?: number;
}

// Spa Follow-up (mensaje automático programado)
export interface SpaFollowUp {
  id: string;
  companyId: string;
  visitId?: string;
  contactId: string;
  type: 'care' | 'follow_up' | 'birthday';
  phone: string;
  message: string;
  mediaUrl?: string;
  scheduledFor: string;
  status: 'pendiente' | 'encolado' | 'enviado' | 'fallido';
  sentAt?: string;
  createdAt: string;
}

// Dashboard metrics
export interface SpaDashboardMetrics {
  clientsToday: number;
  revenueToday: number;
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
