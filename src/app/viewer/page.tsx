"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VenueMap from '@/components/VenueMap';
import { Button } from '@/components/ui/button';
import { Home, Loader2, Database, WifiOff } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { useVenueData } from '@/hooks/use-venue-data';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// 🔴 [변경] SessionProvider, useSession, useVenueData 제거
// 🟢 [추가] 방금 만든 usePublicViewer 훅 import
import { usePublicViewer } from '@/hooks/use-public-viewer'; 
import { timeSlots } from '@/hooks/use-venue-data';

export default function ViewerPage() {
  // 🟢 [변경] 훅 교체: 이제 로그인한 유저가 누구든 상관없이 공개된 데이터를 가져옵니다.
  const { data, loading, error } = usePublicViewer();
  
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string }>({ day: 0, time: timeSlots[0] });
  const [activeTab, setActiveTab] = useState('day-0');

  const handleReturnHome = async () => {
    // 뷰어가 로그인 없이 보는 페이지라면 로그아웃 로직은 상황에 맞춰 조정하세요.
    // 현재는 홈으로 보내는 기능으로 유지합니다.
    router.push('/');
  }

  // 💡 [참고] 만약 뷰어가 '로그인 없이' 봐야 한다면 아래 useEffect는 제거해도 됩니다.
  // 현재는 로그인이 되어있지 않으면 튕겨내는 로직이 유지되어 있습니다.
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

  // 로딩 상태 처리
  if(isUserLoading || loading){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  // 에러 처리 (공개된 차수가 없을 때)
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

  // 데이터가 비어있을 때
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
