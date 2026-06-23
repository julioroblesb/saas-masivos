import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ProviderComponent from "@/components/layouts/provider-component";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
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
      <body className={`${outfit.variable} font-outfit antialiased`}>
        <ProviderComponent>
          <Providers>
            {children}
          </Providers>
        </ProviderComponent>
      </body>
    </html>
  );
}
