
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { RolePanel } from '@/components/admin/RolePanel';
import { MapPanel } from '@/components/admin/MapPanel';
import { LogOut, Loader2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVenueData } from '@/hooks/use-venue-data';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const days = [0, 1, 2, 3];
export const timeSlots = (() => {
  const slots = [];
  for (let h = 7; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('00:00');
  return slots;
})();

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { setSelectedSlot: setGlobalSlot } = useVenueData();

  const [isLinked, setIsLinked] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [activeTab, setActiveTab] = useState('day-0');
  
  const [mapSlot, setMapSlot] = useState<{ day: number; time: string } | null>(null);


  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const slotToSave = selectedSlot;
    if (slotToSave) {
      localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(slotToSave));
      setGlobalSlot(slotToSave);
    }
  }, [selectedSlot, setGlobalSlot]);

  useEffect(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
      const parsedSlot = JSON.parse(storedSlot);
      setSelectedSlot(parsedSlot);
      setMapSlot(parsedSlot);
      setActiveTab(`day-${parsedSlot.day}`);
    } else {
      const defaultSlot = { day: 0, time: '07:00' };
      setSelectedSlot(defaultSlot);
      setMapSlot(defaultSlot);
      setActiveTab('day-0');
    }
  }, []);
  
  const handleSlotChange = (day: number, time: string) => {
    const newSlot = { day, time };
    setSelectedSlot(newSlot);
    if (isLinked) {
      setMapSlot(newSlot);
    }
  };

  const handleTabChange = (newTab: string) => {
    const newDay = parseInt(newTab.split('-')[1], 10);
    setActiveTab(newTab);
    if (timeSlots.length > 0) {
        handleSlotChange(newDay, selectedSlot?.time || timeSlots[0]);
    }
  }
  
  const handleMapSlotChange = (day: number, time: string) => {
      const newSlot = { day, time };
      setMapSlot(newSlot);
      if (isLinked) {
        setSelectedSlot(newSlot);
        setActiveTab(`day-${day}`);
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

  if (isUserLoading || !user || !selectedSlot || !mapSlot) {
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

          <section className="p-4 md:p-8 space-y-4 border-b">
              <div className='flex justify-between items-center mb-4'>
                <h2 className="font-headline text-xl font-semibold">시간대 설정</h2>
                <div className="flex items-center space-x-2">
                  <Switch id="link-panels" checked={isLinked} onCheckedChange={setIsLinked} />
                  <Label htmlFor="link-panels" className='flex items-center gap-2'>
                    <LinkIcon className='h-4 w-4'/>
                    지도 연동
                  </Label>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className='mb-4'>
                  {days.map(day => (
                    <TabsTrigger key={day} value={`day-${day}`}>{day}일차</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
               <div className="flex flex-wrap gap-2 pb-2">
                  {timeSlots.map(time => {
                    const day = parseInt(activeTab.split('-')[1], 10);
                    const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                    return (
                      <Button 
                          key={time} 
                          variant={isSelected ? "default" : "outline"}
                          className="flex-shrink-0 text-xs h-8"
                          onClick={() => handleSlotChange(day, time)}
                      >
                          {time}
                      </Button>
                    )
                  })}
                </div>
          </section>

          <main className="p-4 md:p-8 space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <StaffPanel selectedSlot={selectedSlot} />
                <RolePanel selectedSlot={selectedSlot} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SchedulePanel 
                  selectedSlot={selectedSlot} 
                />
                <MapPanel 
                  selectedSlot={isLinked ? selectedSlot : mapSlot} 
                  onSlotChange={handleMapSlotChange} 
                  isLinked={isLinked}
                />
              </div>
          </main>
      </div>
    </DndProvider>
  );
}

    