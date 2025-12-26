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
  
  // 1. 상태 관리
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  
  // Refs
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  // 2. 드래그 시작 핸들러
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, markerId: string) => {
    if (!isDraggable) return;
    
    e.stopPropagation();

    if (activeMarkerId) setActiveMarkerId(null);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    startPosRef.current = { x: clientX, y: clientY };
    isDraggingRef.current = false;
    setDraggingMarkerId(markerId);
  };

  // 3. 전역 이벤트 리스너 (useEffect)
  useEffect(() => {
    if (!draggingMarkerId) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
        if (!mapRef.current) return;

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

        const moveX = Math.abs(clientX - startPosRef.current.x);
        const moveY = Math.abs(clientY - startPosRef.current.y);

        if (!isDraggingRef.current && (moveX > 5 || moveY > 5)) {
            isDraggingRef.current = true;
        }

        if (isDraggingRef.current) {
            if (e.cancelable) e.preventDefault();

            const mapBounds = mapRef.current.getBoundingClientRect();
            
            let x = ((clientX - mapBounds.left) / mapBounds.width) * 100;
            let y = ((clientY - mapBounds.top) / mapBounds.height) * 100;

            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            const markerElement = mapRef.current.querySelector(`[data-marker-id="${draggingMarkerId}"]`) as HTMLElement;
            if (markerElement) {
                markerElement.style.left = `${x}%`;
                markerElement.style.top = `${y}%`;
            }
        }
    };

    const handleGlobalUp = (e: MouseEvent | TouchEvent) => {
        if (isDraggingRef.current && mapRef.current) {
            const mapBounds = mapRef.current.getBoundingClientRect();
            const clientX = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
            
            let x = ((clientX - mapBounds.left) / mapBounds.width) * 100;
            let y = ((clientY - mapBounds.top) / mapBounds.height) * 100;

            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            onMarkerDragEnd?.(draggingMarkerId, x, y);
        }

        setDraggingMarkerId(null);
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 100);
    };

    window.addEventListener('mousemove', handleGlobalMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
        window.removeEventListener('touchmove', handleGlobalMove);
        window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [draggingMarkerId, onMarkerDragEnd]);

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
                if (isDraggingRef.current) return;
                if (!open) setActiveMarkerId(null);
            }}
        >
            <PopoverTrigger asChild>
                <div
                    data-marker-id={marker.id}
                    className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform hover:scale-110",
                        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        draggingMarkerId === marker.id && "cursor-grabbing z-50 scale-110",
                        isOpen && "z-40 scale-110"
                    )}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    onMouseDown={(e) => handleDragStart(e, marker.id)}
                    onTouchStart={(e) => handleDragStart(e, marker.id)}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isDraggingRef.current) {
                            setActiveMarkerId(prev => prev === marker.id ? null : marker.id);
                        }
                    }}
                >
                    <Avatar className={cn("h-10 w-10 border-2 border-primary-foreground shadow-lg", (draggingMarkerId === marker.id || isOpen) && "border-primary")}>
                        <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                        <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium text-center whitespace-nowrap shadow-sm">
                        {staffNumber}. {staffMember.name}
                    </div>
                </div>
            </PopoverTrigger>
            
            {/* [중요] PopoverContent에도 번역 방지(notranslate) 추가 */}
            <PopoverContent 
                className="w-80 p-0 overflow-hidden notranslate" 
                sideOffset={10}
                // HTML 속성으로 번역 방지
                {...{ "translate": "no" } as any}
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
          // [중요] 최상위 DIV에 번역 방지 설정
          className="relative w-full h-full min-h-[400px] notranslate"
          // HTML 속성으로도 번역 방지 (translate="no")
          {...{ "translate": "no" } as any}
          onClick={() => setActiveMarkerId(null)}
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