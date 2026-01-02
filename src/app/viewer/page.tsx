
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { Home, Loader2, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { timeSlots } from '@/hooks/use-venue-data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { SessionSelector } from '@/components/admin/SessionSelector';


function ViewerContent() {
  const { data, isLoading, initializeFirestoreData } = useVenueData();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { sessionId } = useSession();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string }>({ day: 0, time: timeSlots[0] });
  const [activeTab, setActiveTab] = useState('day-0');

  const handleReturnHome = async () => {
    await auth.signOut();
    router.push('/');
  }

  useEffect(() => {
    if(!isUserLoading && !user){
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newDay = parseInt(newTab.split('-')[1], 10);
    setSelectedSlot({ day: newDay, time: timeSlots[0] });
  }

  const handleSelectSlot = (day: number, time: string) => {
    setSelectedSlot({ day, time });
  }

  if(isUserLoading || isLoading || !sessionId){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if(!data || data.staff.length === 0){
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
             <h2 className="text-xl font-semibold">데이터 없음</h2>
            <p className="text-muted-foreground">선택된 차수에 대한 데이터가 없습니다.</p>
            
            <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border p-4 shadow-sm bg-card">
                <p className="text-sm font-medium text-destructive">
                    관리자이신가요?
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                   관리자 페이지에서 초기 데이터를 생성할 수 있습니다.
                </p>
                <Button 
                    onClick={() => router.push('/admin')} 
                    variant="secondary"
                >
                    <span className="flex items-center gap-2">
                        <span>관리자 페이지로 이동</span>
                    </span>
                </Button>
            </div>
        </div>
    )
  }

  // 3. 정상 렌더링 (지도가 보이는 화면)
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col">
        <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <div className="flex items-center gap-4">
                <SessionSelector />
                <h1 className='font-headline text-2xl font-bold text-primary'>
                    (Day {selectedSlot.day} - {selectedSlot.time})
                </h1>
            </div>
              <Button variant="outline" onClick={handleReturnHome}>
                  <span className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>홈으로 돌아가기</span>
                  </span>
              </Button>
        </header>
        <main className="flex-grow p-4 md:p-8 space-y-4">
            <Tabs defaultValue="day-0" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className='mb-4'>
                  <TabsTrigger value="day-0">Day 0</TabsTrigger>
                  <TabsTrigger value="day-1">Day 1</TabsTrigger>
                  <TabsTrigger value="day-2">Day 2</TabsTrigger>
                  <TabsTrigger value="day-3">Day 3</TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap gap-2 pb-4">
                  {timeSlots.map(time => {
                    const day = parseInt(activeTab.split('-')[1], 10);
                    const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                    return (
                      <Button 
                          key={time} 
                          variant={isSelected ? "default" : "outline"}
                          className="flex-shrink-0 text-xs h-8"
                          onClick={() => handleSelectSlot(day, time)}
                      >
                        {time}
                      </Button>
                    )
                  })}
                </div>
            </Tabs>

            <VenueMap 
                  allMarkers={data.markers} 
                  allMaps={data.maps}
                  staff={data.staff} 
                  schedule={data.schedule}
                  isDraggable={false}
                  selectedSlot={selectedSlot}
                  notification={data.notification}
            />
        </main>
      </div>
    </DndProvider>
  );
}

export default function ViewerPage() {
    return (
        <SessionProvider>
            <ViewerContent />
        </SessionProvider>
    )
}
