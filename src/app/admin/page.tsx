
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { RolePanel } from '@/components/admin/RolePanel';
import { MapPanel } from '@/components/admin/MapPanel';
import { LogOut, Loader2, ExternalLink } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const [isLinked, setIsLinked] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Save the selected slot to localStorage whenever it changes
    if (selectedSlot) {
      localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(selectedSlot));
    }
  }, [selectedSlot]);

  // [수정됨] 페이지 로드 시 초기 슬롯 설정
  useEffect(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
      setSelectedSlot(JSON.parse(storedSlot));
    } else {
      // 기본값으로 첫 번째 시간대 설정
      setSelectedSlot({ day: 0, time: '07:00' });
    }
  }, []);

  const handleSlotChange = (day: number, time: string) => {
    setSelectedSlot({ day, time });
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('venueSyncSelectedSlot');
    router.push('/');
  };

  const openMapWindow = () => {
    window.open('/map', '_blank', 'width=1200,height=800');
  };

  if (isUserLoading || !user || !selectedSlot) {
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
            <div className="flex items-center gap-4">
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <StaffPanel />
              <RolePanel />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SchedulePanel 
                selectedSlot={selectedSlot} 
                onSlotChange={handleSlotChange} 
                isLinked={isLinked}
                onLinkChange={setIsLinked}
              />
              <MapPanel 
                selectedSlot={selectedSlot} 
                onSlotChange={handleSlotChange} 
                isLinked={isLinked}
              />
            </div>
        </main>
    </div>
  );
}
