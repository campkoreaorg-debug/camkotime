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
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: 번역기 확장 프로그램 충돌 방지
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* 여기서 Provider로 감싸주어야 앱 전체에서 useFirebase를 사용할 수 있습니다. */}
        <FirebaseClientProvider>
          {children}
          {/* import 되어 있던 Toaster 컴포넌트도 렌더링에 추가했습니다. */}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}