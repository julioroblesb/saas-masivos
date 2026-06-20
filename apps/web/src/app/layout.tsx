import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import ProviderComponent from "@/components/layouts/provider-component";
import { Providers } from "@/components/providers";

const nunito = Nunito({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: "SaaS Masivos",
  description: "SaaS Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} font-nunito antialiased`}>
        <ProviderComponent>
          <Providers>
            {children}
          </Providers>
        </ProviderComponent>
      </body>
    </html>
  );
}
