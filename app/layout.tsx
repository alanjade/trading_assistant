import type { Metadata } from 'next';
import './globals.css';
import ClientShell from '@/components/ui/ClientShell';

export const metadata: Metadata = {
  title: 'TradeAssist',
  description: 'Multi-indicator trading assistant with strategy builder, screener and journal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
