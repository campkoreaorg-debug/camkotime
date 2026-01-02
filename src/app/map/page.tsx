
"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { timeSlots as defaultTimeSlots } from '@/hooks/use-venue-data';
import { Loader2, Database } from 'lucide-react';
import { useUser } from '@/firebase';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MapPanel } from '@/components/admin/MapPanel';
import { useVenueData } from '@/hooks/use-venue-data';

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  
  const { data, isLoading } = useVenueData(sid); 
  const { user, isUserLoading } = useUser();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);

  useEffect(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
      const parsedSlot = JSON.parse(storedSlot);
      setSelectedSlot(parsedSlot);
    } else {
      setSelectedSlot({ day: 0, time: defaultTimeSlots[0] });
    }
  }, []);

  useEffect(() => {
    if(!isUserLoading && !user){
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSlotChange = (day: number, time: string) => {
    setSelectedSlot({ day, time });
  }

  if(isUserLoading || isLoading || !selectedSlot){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if(!data){
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
      <div className="p-4 md:p-8">
        <MapPanel
          selectedSlot={selectedSlot}
          onSlotChange={handleSlotChange}
          isLinked={false}
        />
      </div>
    </DndProvider>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <MapContent />
    </Suspense>
  )
}
