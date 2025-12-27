'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { CalendarClock, X, UserPlus, Upload } from 'lucide-react';
import type { MapMarker, StaffMember, ScheduleItem, MapInfo } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { useVenueData } from '@/hooks/use-venue-data';
import { useToast } from '@/hooks/use-toast';

interface VenueMapProps {
  allMarkers: MapMarker[];
  allMaps: MapInfo[];
  staff: StaffMember[];
  schedule: ScheduleItem[];
  isDraggable?: boolean;
  selectedSlot: { day: number, time: string } | null;
}

interface GroupedTasks {
  [key: string]: ScheduleItem[];
}

export default function VenueMap({ allMarkers, allMaps, staff, schedule, isDraggable = false, selectedSlot }: VenueMapProps) {
  const { updateMarkerPosition, addMarker, updateMapImage } = useVenueData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const defaultMapImage = PlaceHolderImages.find((img) => img.id === 'map-background');

  const currentMap = useMemo(() => {
    if (!selectedSlot) return null;
    return allMaps.find(m => m.day === selectedSlot.day && m.time === selectedSlot.time);
  }, [allMaps, selectedSlot]);
  
  const finalMapImageUrl = currentMap?.mapImageUrl || defaultMapImage?.imageUrl;

  const currentMarkers = useMemo(() => {
      if (!selectedSlot) return [];
      return allMarkers.filter(m => m.day === selectedSlot.day && m.time === selectedSlot.time);
  }, [allMarkers, selectedSlot]);

  const mapRef = useRef<HTMLDivElement>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentInteractIdRef = useRef<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent, markerId: string) => {
    e.stopPropagation();
    if (activeMarkerId && activeMarkerId !== markerId) {
        setActiveMarkerId(null);
    }
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    currentInteractIdRef.current = markerId;
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
  };

  const handleGlobalMove = (e: PointerEvent) => {
    if (!currentInteractIdRef.current || !mapRef.current) return;

    const moveX = Math.abs(e.clientX - startPosRef.current.x);
    const moveY = Math.abs(e.clientY - startPosRef.current.y);

    if (!isDraggingRef.current && (moveX > 5 || moveY > 5)) {
        if (!isDraggable) return;
        isDraggingRef.current = true;
        setDraggingMarkerId(currentInteractIdRef.current);
        setActiveMarkerId(null);
    }

    if (isDraggingRef.current) {
        e.preventDefault();
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

  const handleGlobalUp = (e: PointerEvent) => {
    const markerId = currentInteractIdRef.current;
    if (markerId && mapRef.current) {
        if (isDraggingRef.current) {
            const mapBounds = mapRef.current.getBoundingClientRect();
            let x = ((e.clientX - mapBounds.left) / mapBounds.width) * 100;
            let y = ((e.clientY - mapBounds.top) / mapBounds.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            updateMarkerPosition(markerId, x, y);
        } else {
            setActiveMarkerId(prev => prev === markerId ? null : markerId);
        }
    }
    setDraggingMarkerId(null);
    currentInteractIdRef.current = null;
    isDraggingRef.current = false;
    window.removeEventListener('pointermove', handleGlobalMove);
    window.removeEventListener('pointerup', handleGlobalUp);
  };

  useEffect(() => {
    return () => {
        window.removeEventListener('pointermove', handleGlobalMove);
        window.removeEventListener('pointerup', handleGlobalUp);
    }
  }, []);

  const handleAddMarkerClick = (staffId: string) => {
    if(!selectedSlot) return;
    addMarker(staffId, selectedSlot.day, selectedSlot.time);
  }

  const handleMapImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if(!selectedSlot) return;
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: 'destructive',
          title: '이미지 크기 초과',
          description: '이미지 파일은 2MB를 초과할 수 없습니다.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newMapImageUrl = reader.result as string;
        updateMapImage(selectedSlot.day, selectedSlot.time, newMapImageUrl);
        toast({
          title: '성공',
          description: `지도 배경 이미지가 ${selectedSlot.day}일차 ${selectedSlot.time}에 맞게 업데이트되었습니다.`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const StaffMarker = ({ marker }: { marker: MapMarker }) => {
    const staffMember = useMemo(() => marker.staffId ? staff.find(s => s.id === marker.staffId) : undefined, [marker.staffId, staff]);
    const staffSchedule = useMemo(() => {
        if (!staffMember || !selectedSlot) return [];
        return schedule.filter(task => task.staffId === staffMember.id && task.day === selectedSlot.day && task.time === selectedSlot.time);
    }, [staffMember, schedule, selectedSlot]);
    
    if (!staffMember) return null;
    const isOpen = activeMarkerId === marker.id;

    return (
        <Popover open={isOpen} onOpenChange={(open) => { if (!open) setActiveMarkerId(null); }}>
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
                    onPointerDown={(e) => handlePointerDown(e, marker.id)}
                    onClick={(e) => e.preventDefault()}
                >
                    <Avatar className={cn("h-10 w-10 border-2 border-primary-foreground shadow-lg pointer-events-none", (draggingMarkerId === marker.id || isOpen) && "border-primary")}>
                        <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                        <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium text-center whitespace-nowrap shadow-sm pointer-events-none">
                        {staffMember.name}
                    </div>
                </div>
            </PopoverTrigger>
            
            <PopoverContent 
                className="w-80 p-0 overflow-hidden notranslate" 
                sideOffset={10}
                {...{ "translate": "no" } as any}
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
                       <CalendarClock className='h-4 w-4'/> 현재 시간대 담당 스케줄
                    </h4>
                    <ScrollArea className="h-[200px] pr-2">
                    {staffSchedule.length > 0 ? (
                        <div className='space-y-3'>
                            {staffSchedule.map(task => (
                                 <div key={task.id} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                     <div className="bg-muted px-3 py-1.5 border-b">
                                        <p className="font-medium text-xs text-muted-foreground">{task.location || 'N/A'}</p>
                                     </div>
                                     <div className="p-2">
                                         <div className="text-sm flex items-start gap-2">
                                             <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                             <span className="leading-tight">{task.event}</span>
                                         </div>
                                     </div>
                                 </div>
                             ))}
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

  const UnassignedStaff = () => {
    const assignedStaffIds = useMemo(() => new Set(currentMarkers.map(m => m.staffId)), [currentMarkers]);
    const unassignedStaff = useMemo(() => staff.filter(s => !assignedStaffIds.has(s.id)), [staff, assignedStaffIds]);
    
    if (unassignedStaff.length === 0 || !isDraggable) return null;

    return (
        <div className="absolute bottom-4 left-4 z-10 bg-card p-2 rounded-lg shadow-lg border max-w-sm">
            <h4 className="font-semibold text-sm mb-2 px-2">미배치 스태프</h4>
            <ScrollArea className="h-28">
                <div className="flex flex-wrap gap-2 p-2">
                    {unassignedStaff.map(s => (
                        <Button key={s.id} variant="secondary" size="sm" onClick={() => handleAddMarkerClick(s.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            {s.name}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
  }
  
  const MapActions = () => {
    if (!isDraggable || !selectedSlot) return null;

    return (
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            배경 업로드
        </Button>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleMapImageUpload}
            className="hidden"
            accept="image/png, image/jpeg, image/gif"
        />
      </div>
    )
  }

  if (!selectedSlot) {
    return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-muted/20 rounded-xl border border-dashed shadow-sm">
            <p className="text-muted-foreground">시간대를 선택하여 지도를 확인하세요.</p>
        </div>
    )
  }

  return (
    <div className="w-full h-full bg-slate-50/50 rounded-xl overflow-hidden border shadow-sm">
        <div 
          ref={mapRef}
          className="relative w-full h-full min-h-[500px] notranslate"
          {...{ "translate": "no" } as any}
          onPointerDown={() => setActiveMarkerId(null)}
        >
          {finalMapImageUrl ? (
            <Image
              src={finalMapImageUrl}
              alt="Venue Map"
              fill
              className="object-cover pointer-events-none"
              priority
            />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground">배경 이미지가 없습니다.</p>
            </div>
          )}

          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          
          <MapActions />
          <UnassignedStaff />

          {currentMarkers.map((marker) => (
             <StaffMarker key={marker.id} marker={marker} />
          ))}
        </div>
    </div>
  );
}
