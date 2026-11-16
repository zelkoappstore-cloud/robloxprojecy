import './globals.css';

export const metadata = {
  title: 'Zelko',
  icons: { icon: '/logo.webp', apple: '/logo.webp' },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://zelko-prototype.vercel.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='fr'>
      <body className='min-h-screen bg-slate-950 text-slate-100'>{children}</body>
    </html>
  );
}
