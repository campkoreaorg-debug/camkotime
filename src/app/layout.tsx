import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'VenueSync',
  description: 'Real-time venue management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // [수정] suppressHydrationWarning={true} 추가
    <html 
      lang="ko" 
      translate="no" 
      suppressHydrationWarning={true}
    >
      <body className="font-body antialiased bg-background notranslate">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}