"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VenueMap from '@/components/VenueMap';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, Database, WifiOff } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { usePublicViewer } from '@/hooks/use-public-viewer'; 
import { timeSlots } from '@/hooks/use-venue-data';

export default function ViewerPage() {
  const { data, loading, error } = usePublicViewer();
  
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string }>({ day: 0, time: timeSlots[0] });
  const [activeTab, setActiveTab] = useState('day-0');

  const handleLogout = async () => {
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

  if(isUserLoading || loading){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if(error) {
     return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
             <h2 className="text-xl font-semibold">공개된 차수 없음</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => router.push('/')}>홈으로 돌아가기</Button>
        </div>
     )
  }

  if(!data || data.staff.length === 0){
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
             <h2 className="text-xl font-semibold">데이터 없음</h2>
            <p className="text-muted-foreground">공개된 차수는 있지만, 내부 데이터가 비어있습니다.</p>
            <Button variant="outline" onClick={() => router.push('/')}>홈으로 돌아가기</Button>
        </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-background">
        <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <div className="flex items-center gap-4">
                <h1 className='font-headline text-2xl font-bold text-primary'>
                   VenueSync 뷰어 <span className="text-muted-foreground text-lg font-normal ml-2">(Day {selectedSlot.day} - {selectedSlot.time})</span>
                </h1>
            </div>
              <Button variant="outline" onClick={handleLogout}>
                  <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>로그아웃</span>
                  </span>
              </Button>
        </header>
        <main className="flex-grow p-4 md:p-8 space-y-4">
            <Tabs defaultValue="day-0" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className='mb-4'>
                  <TabsTrigger value="day-0">0일차</TabsTrigger>
                  <TabsTrigger value="day-1">1일차</TabsTrigger>
                  <TabsTrigger value="day-2">2일차</TabsTrigger>
                  <TabsTrigger value="day-3">3일차</TabsTrigger>
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
            <div className="border rounded-xl shadow-sm bg-slate-50/50 overflow-hidden" style={{ minHeight: '600px' }}>
                <VenueMap 
                      allMarkers={data.markers} 
                      allMaps={data.maps}
                      staff={data.staff} 
                      schedule={data.schedule}
                      isDraggable={false} 
                      selectedSlot={selectedSlot}
                      notification={data.notification}
                />
            </div>
        </main>
      </div>
    </DndProvider>
  );
}
