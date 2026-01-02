
"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { timeSlots as defaultTimeSlots } from '@/hooks/use-venue-data';
import { Loader2, Database, Link as LinkIcon } from 'lucide-react';
import { useUser } from '@/firebase';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MapPanel } from '@/components/admin/MapPanel';
import { useVenueData } from '@/hooks/use-venue-data';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { useBroadcastChannel } from '@/hooks/use-broadcast-channel';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DragState {
  staff: { id: string; name: string; avatar: string; };
  x: number;
  y: number;
}

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  
  const { data, isLoading, addMarker } = useVenueData(sid); 
  const { user, isUserLoading } = useUser();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [isLinked, setIsLinked] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);


  const handleMessage = useCallback((message: any) => {
    if (message.type === 'staff-drag-start') {
      setDragState({ staff: message.staff, x: message.x, y: message.y });
    } else if (message.type === 'staff-drag-move') {
      if (dragState) {
        setDragState(prev => prev ? { ...prev, x: message.x, y: message.y } : null);
      }
    } else if (message.type === 'staff-drag-end') {
      setDragState(null);
    }
  }, [dragState]);

  useBroadcastChannel('venue-sync', handleMessage);
  
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (dragState && selectedSlot) {
      const mapElement = document.getElementById('map-container-droppable');
      if (mapElement) {
        const rect = mapElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        addMarker(dragState.staff.id, selectedSlot.day, selectedSlot.time, x, y);
      }
    }
    setDragState(null);
  }, [dragState, selectedSlot, addMarker]);
  
  useEffect(() => {
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', e => e.preventDefault());
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDrop]);


  const updateSlotFromStorage = useCallback(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
        const parsedSlot = JSON.parse(storedSlot);
        if (JSON.stringify(parsedSlot) !== JSON.stringify(selectedSlot)) {
            setSelectedSlot(parsedSlot);
        }
    }
  }, [selectedSlot]);

  useEffect(() => {
      updateSlotFromStorage(); // Initial check
  }, [updateSlotFromStorage]);
  
  useEffect(() => {
      const handleStorageChange = (event: StorageEvent) => {
          if (event.key === 'venueSyncSelectedSlot' && isLinked) {
              updateSlotFromStorage();
          }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => {
          window.removeEventListener('storage', handleStorageChange);
      };
  }, [isLinked, updateSlotFromStorage]);

  useEffect(() => {
    if(!isUserLoading && !user){
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSlotChange = (day: number, time: string) => {
    const newSlot = { day, time };
    setSelectedSlot(newSlot);
    if(isLinked){
        localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(newSlot));
    }
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
      {dragState && (
        <div 
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2" 
          style={{ left: dragState.x, top: dragState.y }}
        >
          <div className={cn("relative group flex flex-col items-center gap-2 rounded-md border p-3 text-center transition-all bg-primary/90 text-primary-foreground shadow-2xl scale-110")}>
             <Avatar className={cn('h-12 w-12')}>
                <AvatarImage src={dragState.staff.avatar} alt={dragState.staff.name} />
                <AvatarFallback>{dragState.staff.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className='flex-1'>
                <p className="font-semibold text-sm">{dragState.staff.name}</p>
            </div>
          </div>
        </div>
      )}
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-end">
            <div className="flex items-center space-x-2">
                <Switch id="link-panels" checked={isLinked} onCheckedChange={setIsLinked} />
                <Label htmlFor="link-panels" className='flex items-center gap-2'>
                    <LinkIcon className='h-4 w-4'/>
                    관리자 페이지와 시간 연동
                </Label>
            </div>
        </div>
        <div id="map-container-droppable">
            <MapPanel
            selectedSlot={selectedSlot}
            onSlotChange={handleSlotChange}
            isLinked={isLinked}
            />
        </div>
      </div>
    </DndProvider>
  );
}

function MapPageWrapper() {
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  const { setSessionId, sessionId: contextSessionId } = useSession();

  useEffect(() => {
    if (sid && sid !== contextSessionId) {
      setSessionId(sid);
    }
  }, [sid, contextSessionId, setSessionId]);
  
  if (!contextSessionId && sid) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return <MapContent />;
}


export default function MapPage() {
  return (
    <SessionProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <MapPageWrapper />
      </Suspense>
    </SessionProvider>
  )
}
