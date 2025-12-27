
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { MapPanel } from '@/components/admin/MapPanel';
import { LogOut, Loader2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const [isLinked, setIsLinked] = useState(true);
  const [scheduleSlot, setScheduleSlot] = useState<{ day: number; time: string } | null>(null);
  const [mapSlot, setMapSlot] = useState<{ day: number; time: string } | null>(null);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const handleSlotChange = (day: number, time: string) => {
    const newSlot = { day, time };
    setScheduleSlot(newSlot);
    if (isLinked) {
      setMapSlot(newSlot);
    }
  };
  
  const handleMapSlotChange = (day: number, time: string) => {
    const newSlot = { day, time };
    setMapSlot(newSlot);
     if (isLinked) {
      setScheduleSlot(newSlot);
    }
  }

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
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="link-panels" checked={isLinked} onCheckedChange={setIsLinked} />
                <Label htmlFor="link-panels" className='flex items-center gap-2'>
                  <LinkIcon className='h-4 w-4'/>
                  시간대 연동
                </Label>
              </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SchedulePanel selectedSlot={scheduleSlot} onSlotChange={handleSlotChange} isLinked={isLinked} />
              <MapPanel selectedSlot={mapSlot} onSlotChange={handleMapSlotChange} isLinked={isLinked}/>
            </div>
        </main>
    </div>
  );
}
