import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Tracker',
  description: 'Time tracking and project management application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
