
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
import { PositionPanel } from '@/components/admin/PositionPanel';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';


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

  useEffect(() => {
    // Save the selected slot to localStorage whenever it changes
    // If linked, save schedule slot, otherwise, map panel can have its own state
    const slotToSave = isLinked ? scheduleSlot : mapSlot;
    if (slotToSave) {
      localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(slotToSave));
    }
  }, [scheduleSlot, mapSlot, isLinked]);

  useEffect(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
      const parsedSlot = JSON.parse(storedSlot);
      setScheduleSlot(parsedSlot);
      setMapSlot(parsedSlot);
    } else {
      // Default to the first time slot
      const defaultSlot = { day: 0, time: '07:00' };
      setScheduleSlot(defaultSlot);
      setMapSlot(defaultSlot);
    }
  }, []);
  
  const handleScheduleSlotChange = (day: number, time: string) => {
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
  };

  const handleLogout = async () => {
    await auth.signOut();
    localStorage.removeItem('venueSyncSelectedSlot');
    router.push('/');
  };

  const openMapWindow = () => {
    window.open('/map', '_blank', 'width=1200,height=800');
  };

  if (isUserLoading || !user || !scheduleSlot || !mapSlot) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
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
                <div className='flex flex-col gap-8'>
                  <RolePanel />
                  <PositionPanel />
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SchedulePanel 
                  selectedSlot={scheduleSlot} 
                  onSlotChange={handleScheduleSlotChange}
                  isLinked={isLinked}
                  onLinkChange={setIsLinked}
                />
                <MapPanel 
                  selectedSlot={mapSlot} 
                  onSlotChange={handleMapSlotChange} 
                  isLinked={isLinked}
                />
              </div>
          </main>
      </div>
    </DndProvider>
  );
}
