import type { Metadata } from 'next';
import './globals.css';
import ProviderComponent from '@/components/layouts/provider-component';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    default: 'Renova CRM',
    template: '%s | Renova CRM',
  },
  description: 'Gestión de clientes, agenda y automatización para spas y salones.',
  applicationName: 'Renova CRM',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <ProviderComponent>
          <Providers>{children}</Providers>
        </ProviderComponent>
      </body>
    </html>
  );
}
