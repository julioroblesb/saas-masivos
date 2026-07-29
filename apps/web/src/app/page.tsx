import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'CRM para centros de belleza en Perú',
  description:
    'Organiza citas, clientes, atenciones y seguimientos por WhatsApp desde un solo lugar con Renova CRM.',
  alternates: {
    canonical: 'https://crmrenova.com',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  return <LandingPage />;
}
