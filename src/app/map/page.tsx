"use client";

import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams 추가
import { useEffect, useState, Suspense } from 'react'; // Suspense 추가
import VenueMap from '@/components/VenueMap';
import { useVenueData, timeSlots } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { Home, Loader2, Database } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// 내부 컴포넌트로 분리 (useSearchParams 사용을 위해)
function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🔴 [핵심 수정] URL에서 '?sid=...' 값을 가져옵니다.
  const sid = searchParams.get('sid'); 
  
  // 🔴 [핵심 수정] 가져온 sid를 훅에 전달합니다. 
  // 이제 훅이 이 ID를 보고 데이터를 가져옵니다.
  const { data, isLoading } = useVenueData(sid); 
  
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string }>({ day: 0, time: timeSlots[0] });
  const [activeTab, setActiveTab] = useState('day-0');

  const handleReturnHome = async () => {
    if (window.opener) {
        window.close();
    } else {
        router.push('/');
    }
  }

  useEffect(() => {
    if(!isUserLoading && !user){
      router.push('/'); // 로그인 안 했으면 쫓아냄
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

  if(isUserLoading || isLoading){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  // 데이터가 없거나 로드되지 않았을 때
  if(!data || data.staff.length === 0){
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
             <h2 className="text-xl font-semibold">데이터 없음</h2>
            <p className="text-muted-foreground">
               {sid ? '선택된 차수에 데이터가 없습니다.' : '차수 정보(ID)를 찾을 수 없습니다.'}
            </p>
        </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-background">
        <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <div className="flex items-center gap-4">
                <h1 className='font-headline text-2xl font-bold text-primary'>
                   실시간 상황판 <span className="text-muted-foreground text-lg font-normal ml-2">(Day {selectedSlot.day} - {selectedSlot.time})</span>
                </h1>
            </div>
              <Button variant="outline" onClick={handleReturnHome}>
                  <span className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>창 닫기</span>
                  </span>
              </Button>
        </header>
        <main className="flex-grow p-4 md:p-8 space-y-4">
            <Tabs defaultValue="day-0" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className='mb-4'>
                  <TabsTrigger value="day-0">1일차</TabsTrigger>
                  <TabsTrigger value="day-1">2일차</TabsTrigger>
                  <TabsTrigger value="day-2">3일차</TabsTrigger>
                  <TabsTrigger value="day-3">4일차</TabsTrigger>
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

// 🔴 [필수] useSearchParams를 쓰는 컴포넌트는 Suspense로 감싸야 함
export default function MapPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <MapContent />
    </Suspense>
  )
}