'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { CalendarClock, X } from 'lucide-react';
import type { MapMarker, StaffMember, ScheduleItem } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';

interface VenueMapProps {
  markers: MapMarker[];
  staff: StaffMember[];
  schedule: ScheduleItem[];
  mapImageUrl?: string;
  isDraggable?: boolean;
  onMarkerDragEnd?: (markerId: string, x: number, y: number) => void;
}

interface GroupedTasks {
  [key: string]: ScheduleItem[];
}

export default function VenueMap({ markers, staff, schedule, mapImageUrl, isDraggable = false, onMarkerDragEnd }: VenueMapProps) {
  const defaultMapImage = PlaceHolderImages.find((img) => img.id === 'map-background');
  const finalMapImageUrl = mapImageUrl || defaultMapImage?.imageUrl;

  const mapRef = useRef<HTMLDivElement>(null);
  
  // 상태 관리
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  
  // Refs (렌더링 없이 값 저장)
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentInteractIdRef = useRef<string | null>(null);

  // [1] 마우스/터치 시작 (PointerDown)
  const handlePointerDown = (e: React.PointerEvent, markerId: string) => {
    // 이벤트 전파 방지
    e.stopPropagation();
    
    // 다른 팝업이 열려있으면 닫음
    if (activeMarkerId && activeMarkerId !== markerId) {
        setActiveMarkerId(null);
    }

    // 초기화
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false; // 일단 클릭으로 가정
    currentInteractIdRef.current = markerId;

    // 전역 이벤트 등록 (드래그가 컴포넌트 밖으로 나가도 추적하기 위함)
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
  };

  // [2] 움직임 감지 (PointerMove)
  const handleGlobalMove = (e: PointerEvent) => {
    if (!currentInteractIdRef.current || !mapRef.current) return;

    const moveX = Math.abs(e.clientX - startPosRef.current.x);
    const moveY = Math.abs(e.clientY - startPosRef.current.y);

    // 5px 이상 움직이면 "드래그 모드"로 진입
    if (!isDraggingRef.current && (moveX > 5 || moveY > 5)) {
        if (!isDraggable) return; // 드래그 권한 없으면 무시
        
        isDraggingRef.current = true;
        setDraggingMarkerId(currentInteractIdRef.current); // 시각적 드래그 상태 활성화
        
        // 드래그 시작 시 팝업이 열려있었다면 닫기
        setActiveMarkerId(null);
    }

    // 드래그 중 위치 업데이트 (DOM 직접 조작으로 성능 최적화)
    if (isDraggingRef.current) {
        e.preventDefault(); // 스크롤 방지
        const mapBounds = mapRef.current.getBoundingClientRect();
        
        let x = ((e.clientX - mapBounds.left) / mapBounds.width) * 100;
        let y = ((e.clientY - mapBounds.top) / mapBounds.height) * 100;

        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        const markerElement = mapRef.current.querySelector(`[data-marker-id="${currentInteractIdRef.current}"]`) as HTMLElement;
        if (markerElement) {
            markerElement.style.left = `${x}%`;
            markerElement.style.top = `${y}%`;
        }
    }
  };

  // [3] 조작 종료 (PointerUp) -> 여기서 클릭 vs 드래그 최종 판별
  const handleGlobalUp = (e: PointerEvent) => {
    const markerId = currentInteractIdRef.current;
    
    if (markerId && mapRef.current) {
        if (isDraggingRef.current) {
            // [A] 드래그 종료 -> 위치 저장
            const mapBounds = mapRef.current.getBoundingClientRect();
            let x = ((e.clientX - mapBounds.left) / mapBounds.width) * 100;
            let y = ((e.clientY - mapBounds.top) / mapBounds.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            onMarkerDragEnd?.(markerId, x, y);
        } else {
            // [B] 드래그 아님 (5px 미만 이동) -> "이것은 클릭이다!"
            // 여기서 수동으로 팝업을 토글합니다.
            setActiveMarkerId(prev => prev === markerId ? null : markerId);
        }
    }

    // 정리
    setDraggingMarkerId(null);
    currentInteractIdRef.current = null;
    isDraggingRef.current = false;
    
    window.removeEventListener('pointermove', handleGlobalMove);
    window.removeEventListener('pointerup', handleGlobalUp);
  };

  // Cleanup
  useEffect(() => {
      return () => {
        window.removeEventListener('pointermove', handleGlobalMove);
        window.removeEventListener('pointerup', handleGlobalUp);
      }
  }, []);

  // --- 렌더링 ---
  const StaffMarker = ({ marker }: { marker: MapMarker }) => {
    const staffMember = useMemo(() => marker.staffId ? staff.find(s => s.id === marker.staffId) : undefined, [marker.staffId, staff]);
    const staffIndex = useMemo(() => staffMember ? staff.findIndex(s => s.id === staffMember.id) : -1, [staffMember, staff]);
    const staffNumber = staffIndex !== -1 ? staffIndex + 1 : null;
    
    const staffTasks = useMemo(() => schedule.filter(task => task.staffId === staffMember?.id), [staffMember, schedule]);
    const groupedTasks = useMemo(() => {
        return staffTasks.reduce((acc, task) => {
            const key = `${task.day}-${task.time}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(task);
            return acc;
        }, {} as GroupedTasks);
    }, [staffTasks]);

    if (!staffMember) return null;

    const isOpen = activeMarkerId === marker.id;

    return (
        <Popover 
            open={isOpen} 
            onOpenChange={(open) => {
                // 외부 클릭 시 닫힘 처리
                // (열림 처리는 handleGlobalUp에서 수동으로 하므로 여기서는 닫힘만 신경 씀)
                if (!open) setActiveMarkerId(null);
            }}
        >
            <PopoverTrigger asChild>
                <div
                    data-marker-id={marker.id}
                    className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform hover:scale-110 touch-none select-none", 
                        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        draggingMarkerId === marker.id && "cursor-grabbing z-50 scale-110",
                        isOpen && "z-40 scale-110"
                    )}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    // [핵심 1] 드래그 시작 감지
                    onPointerDown={(e) => handlePointerDown(e, marker.id)}
                    // [핵심 2] PopoverTrigger의 기본 클릭 동작 무력화 (우리가 수동 제어하므로)
                    onClick={(e) => e.preventDefault()}
                >
                    <Avatar className={cn("h-10 w-10 border-2 border-primary-foreground shadow-lg pointer-events-none", (draggingMarkerId === marker.id || isOpen) && "border-primary")}>
                        <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                        <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium text-center whitespace-nowrap shadow-sm pointer-events-none">
                        {staffNumber}. {staffMember.name}
                    </div>
                </div>
            </PopoverTrigger>
            
            <PopoverContent 
                className="w-80 p-0 overflow-hidden notranslate" 
                sideOffset={10}
                {...{ "translate": "no" } as any}
                // 팝업 내부 클릭 시 닫히거나 이벤트 버블링 방지
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div className="bg-primary/5 p-4 border-b flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                            <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                            <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-lg font-bold leading-none">{staffMember.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{staffMember.role || 'Staff Member'}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2" onClick={() => setActiveMarkerId(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary">
                       <CalendarClock className='h-4 w-4'/> 담당 스케줄
                    </h4>
                    <ScrollArea className="h-[200px] pr-2">
                    {staffTasks.length > 0 ? (
                        <div className='space-y-3'>
                            {Object.entries(groupedTasks).map(([key, tasks]) => {
                                 const [day, time] = key.split('-');
                                 return (
                                     <div key={key} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                         <div className="bg-muted px-3 py-1.5 border-b">
                                            <p className="font-medium text-xs text-muted-foreground">Day {day} • {time}</p>
                                         </div>
                                         <div className="p-2 space-y-1">
                                             {tasks.map(task => (
                                                 <div key={task.id} className="text-sm flex items-start gap-2">
                                                     <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                                     <span className="leading-tight">{task.event}</span>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground gap-2">
                            <CalendarClock className="h-8 w-8 opacity-20" />
                            <p className="text-sm">배정된 업무가 없습니다.</p>
                        </div>
                    )}
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    )
  }

  return (
    <div className="w-full h-full bg-slate-50/50 rounded-xl overflow-hidden border shadow-sm">
        <div 
          ref={mapRef}
          className="relative w-full h-full min-h-[400px] notranslate"
          {...{ "translate": "no" } as any}
          // 배경 클릭 시 팝업 닫기
          onPointerDown={() => setActiveMarkerId(null)}
        >
          {finalMapImageUrl && (
            <Image
              src={finalMapImageUrl}
              alt="Venue Map"
              fill
              className="object-cover pointer-events-none"
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          
          {markers.filter(marker => marker.type === 'staff').map((marker) => (
             <StaffMarker key={marker.id} marker={marker} />
          ))}
        </div>
    </div>
  );
}