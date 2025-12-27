
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { LogOut, Loader2, ExternalLink } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);


  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  const openMapWindow = () => {
    window.open('/map', '_blank', 'width=1200,height=800');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
        <header className='flex justify-between items-center p-4 border-b bg-card'>
            <h1 className='font-headline text-2xl font-bold text-primary'>VenueSync 대시보드</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={openMapWindow}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  새 창으로 열기
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
              </Button>
            </div>
        </header>
        <main className="p-4 md:p-8 space-y-8">
            <StaffPanel />
            <SchedulePanel />
        </main>
    </div>
  );
}
