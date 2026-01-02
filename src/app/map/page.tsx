
"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Link as LinkIcon, Loader2, User } from 'lucide-react';
import { DndProvider, useDrag } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useUser } from '@/firebase';
import { MapPanel } from '@/components/admin/MapPanel';
import { useVenueData } from '@/hooks/use-venue-data';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTypes } from '@/components/admin/StaffPanel';
import type { StaffMember } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const DraggableStaffItem = ({ staff, isScheduled }: { staff: StaffMember, isScheduled: boolean }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.STAFF,
        item: { staffId: staff.id },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={drag}
            className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-md border bg-card cursor-grab transition-all",
                isDragging && "opacity-50",
                isScheduled && "border-destructive ring-1 ring-destructive"
            )}
        >
            <Avatar className="h-10 w-10">
                <AvatarImage src={staff.avatar} alt={staff.name} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium truncate">{staff.name}</p>
        </div>
    );
};


function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  
  const { data, isLoading } = useVenueData(sid); 
  const { user, isUserLoading } = useUser();

  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [isLinked, setIsLinked] = useState(true);

  const updateSlotFromStorage = useCallback(() => {
    const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
    if (storedSlot) {
        try {
            const parsedSlot = JSON.parse(storedSlot);
            if (JSON.stringify(parsedSlot) !== JSON.stringify(selectedSlot)) {
                setSelectedSlot(parsedSlot);
            }
        } catch (e) {
            console.error("Failed to parse selected slot from localStorage", e);
            localStorage.removeItem('venueSyncSelectedSlot');
        }
    } else if (selectedSlot === null) {
        setSelectedSlot({ day: 0, time: '07:00' });
    }
  }, [selectedSlot]);

  useEffect(() => {
      updateSlotFromStorage(); 
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

  const scheduledStaffIds = useMemo(() => {
    if (!data || !selectedSlot) return new Set<string>();
    
    const ids = new Set<string>();

    (data.schedule || []).forEach(s => {
        if (s.day === selectedSlot.day && s.time === selectedSlot.time) {
            (s.staffIds || []).forEach(staffId => ids.add(staffId));
        }
    });
    return ids;
  }, [data, selectedSlot]);

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
      <div className="p-4 md:p-8 space-y-6 flex flex-col h-screen">
        <header className="flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
                <h1 className='font-headline text-2xl font-bold text-primary'>
                    VenueSync 지도 <Badge variant="outline" className="ml-2">따로 보기</Badge>
                </h1>
                <div className="flex items-center space-x-2">
                    <Switch id="link-panels" checked={isLinked} onCheckedChange={setIsLinked} />
                    <Label htmlFor="link-panels" className='flex items-center gap-2'>
                        <LinkIcon className='h-4 w-4'/>
                        관리자 페이지와 시간 연동
                    </Label>
                </div>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">스태프 목록</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-40">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(theme(spacing.20),1fr))] gap-3 p-1">
                            {data.staff.map(staff => (
                                <DraggableStaffItem 
                                  key={staff.id} 
                                  staff={staff}
                                  isScheduled={scheduledStaffIds.has(staff.id)}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </header>

        <main className="flex-grow min-h-0">
            <MapPanel
                selectedSlot={selectedSlot}
                onSlotChange={handleSlotChange}
                isLinked={isLinked}
            />
        </main>
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
