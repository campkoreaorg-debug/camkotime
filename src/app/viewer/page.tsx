"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { Home, Loader2, Database } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { timeSlots } from '@/hooks/use-venue-data';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Session 관련 import 제거
// import { SessionProvider, useSession } from '@/hooks/use-session';
// import { SessionSelector } from '@/components/admin/SessionSelector';

export default function ViewerPage() {
  const { data, isLoading } = useVenueData();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  // sessionId 관련 로직 제거
  // const { sessionId } = useSession();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string }>({ day: 0, time: timeSlots[0] });
  const [activeTab, setActiveTab] = useState('day-0');

  const handleReturnHome = async () => {
    // 뷰어 모드에서 로그아웃이 필요한지 여부는 기획에 따라 결정 (여기선 일단 유지)
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
    // 탭 변경 시 시간은 07:00(첫 타임)으로 초기화하거나, 현재 선택된 시간을 유지할 수도 있음.
    // 여기서는 첫 타임으로 초기화하는 기존 로직 유지
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

  if(!data || data.staff.length === 0){
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
             <h2 className="text-xl font-semibold">데이터 없음</h2>
            <p className="text-muted-foreground">불러올 데이터가 없습니다.</p>
            
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen flex flex-col bg-background">
        <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <div className="flex items-center gap-4">
                {/* SessionSelector 제거됨 */}
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
                  <TabsTrigger value="day-0">1일차</TabsTrigger>
                  <TabsTrigger value="day-1">2일차</TabsTrigger>
                  <TabsTrigger value="day-2">3일차</TabsTrigger>
                  <TabsTrigger value="day-3">4일차</TabsTrigger>
              </TabsList>
              
              {/* 시간대 버튼 영역 - 스크롤 가능하도록 개선 */}
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

            {/* 지도 컴포넌트: isDraggable={false}로 설정하여 뷰어 모드로 작동 */}
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