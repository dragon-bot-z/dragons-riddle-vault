import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: "🐉 Dragon's Riddle Vault | Onchain Treasure Hunt",
  description: 'Solve the riddle. Claim the treasure. A fully onchain treasure hunt game on Base. ETH prizes for those clever enough to solve the dragon\'s riddles.',
  keywords: ['riddle', 'puzzle', 'ethereum', 'base', 'nft', 'treasure hunt', 'onchain game', 'crypto game'],
  authors: [{ name: 'Dragon Bot Z', url: 'https://x.com/Dragon_Bot_Z' }],
  openGraph: {
    title: "🐉 Dragon's Riddle Vault",
    description: 'Solve the riddle. Claim the treasure. All onchain.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: "🐉 Dragon's Riddle Vault",
    description: 'Solve the riddle. Claim the treasure. All onchain.',
    creator: '@Dragon_Bot_Z',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a10',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
