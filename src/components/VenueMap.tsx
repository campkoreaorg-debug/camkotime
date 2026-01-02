'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { CalendarClock, X, UserPlus, Upload, Megaphone, Trash2, Users } from 'lucide-react';
import type { MapMarker, StaffMember, ScheduleItem, MapInfo } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { useVenueData } from '@/hooks/use-venue-data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useDrop } from 'react-dnd';
import { ItemTypes } from './admin/StaffPanel';

interface VenueMapProps {
  allMarkers: MapMarker[];
  allMaps: MapInfo[];
  staff: StaffMember[];
  schedule: ScheduleItem[];
  isDraggable?: boolean;
  selectedSlot: { day: number, time: string } | null;
  notification?: string;
}

export default function VenueMap({ allMarkers, allMaps, staff, schedule, isDraggable = false, selectedSlot, notification }: VenueMapProps) {
  const { updateMarkerPosition, addMarker, updateMapImage, deleteMarker } = useVenueData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  // 🔴 [추가] 이미지 비율 상태 관리
  // 기본 16:9 비율 (1600/900)로 시작
  const [mapAspectRatio, setMapAspectRatio] = useState(16 / 9);

  useEffect(() => {
    if (notification) {
      setIsBannerVisible(true);
    }
  }, [notification]);
  
  const defaultMapImage = PlaceHolderImages.find((img) => img.id === 'map-background');

  const currentMap = useMemo(() => {
    if (!selectedSlot) return null;
    return allMaps.find(m => m.day === selectedSlot.day && m.time === selectedSlot.time);
  }, [allMaps, selectedSlot]);
  
  const finalMapImageUrl = currentMap?.mapImageUrl || defaultMapImage?.imageUrl;

  const currentMarkers = useMemo(() => {
    if (!selectedSlot) return [];
    
    const scheduledStaffIds = new Set(
        schedule
            .filter(s => s.day === selectedSlot.day && s.time === selectedSlot.time)
            .flatMap(s => s.staffIds || [])
    );

    const timeSpecificMarkers = allMarkers.filter(m => m.day === selectedSlot.day && m.time === selectedSlot.time);
    const staffWithMarkers = new Set(timeSpecificMarkers.flatMap(m => m.staffIds || []));
    const markersToShow = [...timeSpecificMarkers];

    scheduledStaffIds.forEach(staffId => {
        if (staffId && !staffWithMarkers.has(staffId)) {
            const defaultMarker: MapMarker = {
                id: `default-marker-${staffId}-${selectedSlot.day}-${selectedSlot.time}`,
                staffIds: [staffId],
                day: selectedSlot.day,
                time: selectedSlot.time,
                x: 50,
                y: 50,
            };
            markersToShow.push(defaultMarker);
        }
    });
      
    return markersToShow;
  }, [allMarkers, schedule, selectedSlot]);


  const mapRef = useRef<HTMLDivElement>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [draggingMarker, setDraggingMarker] = useState<MapMarker | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentInteractMarkerRef = useRef<MapMarker | null>(null);
  const [isUnassignedPopoverOpen, setIsUnassignedPopoverOpen] = useState(false);

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.STAFF,
    drop: (item: { staffId: string }, monitor) => {
      if (!selectedSlot || !mapRef.current) return;
      const dropPosition = monitor.getClientOffset();
      const mapBounds = mapRef.current.getBoundingClientRect();
      
      if(dropPosition){
        let x = ((dropPosition.x - mapBounds.left) / mapBounds.width) * 100;
        let y = ((dropPosition.y - mapBounds.top) / mapBounds.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        
        addMarker(item.staffId, selectedSlot.day, selectedSlot.time, x, y);
      }
    },
  }), [selectedSlot, addMarker]);

  drop(mapRef);

  const handlePointerDown = (e: React.PointerEvent, marker: MapMarker) => {
    e.stopPropagation();
    if (activeMarkerId && activeMarkerId !== marker.id) {
        setActiveMarkerId(null);
    }
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    currentInteractMarkerRef.current = marker;
    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
  };

  const handleGlobalMove = (e: PointerEvent) => {
    if (!currentInteractMarkerRef.current || !mapRef.current) return;

    const moveX = Math.abs(e.clientX - startPosRef.current.x);
    const moveY = Math.abs(e.clientY - startPosRef.current.y);

    if (!isDraggingRef.current && (moveX > 5 || moveY > 5)) {
        if (!isDraggable) return;
        isDraggingRef.current = true;
        setDraggingMarker(currentInteractMarkerRef.current);
        setActiveMarkerId(null);
    }

    if (isDraggingRef.current) {
        e.preventDefault();
        const mapBounds = mapRef.current.getBoundingClientRect();
        let x = ((e.clientX - mapBounds.left) / mapBounds.width) * 100;
        let y = ((e.clientY - mapBounds.top) / mapBounds.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        const markerElement = mapRef.current.querySelector(`[data-marker-id="${currentInteractMarkerRef.current.id}"]`) as HTMLElement;
        if (markerElement) {
            markerElement.style.left = `${x}%`;
            markerElement.style.top = `${y}%`;
        }
    }
  };

  const handleGlobalUp = (e: PointerEvent) => {
    const marker = currentInteractMarkerRef.current;
    if (marker && mapRef.current) {
        if (isDraggingRef.current) {
            const mapBounds = mapRef.current.getBoundingClientRect();
            let x = ((e.clientX - mapBounds.left) / mapBounds.width) * 100;
            let y = ((e.clientY - mapBounds.top) / mapBounds.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            
            updateMarkerPosition(marker.id, x, y, marker.staffIds, marker.day, marker.time);
        } else {
            setActiveMarkerId(prev => prev === marker.id ? null : marker.id);
        }
    }
    setDraggingMarker(null);
    currentInteractMarkerRef.current = null;
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
    addMarker(staffId, selectedSlot.day, selectedSlot.time, Math.round(Math.random() * 80) + 10, Math.round(Math.random() * 80) + 10);
  }

  const handleMapImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if(!selectedSlot) return;
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
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
          description: `지도 배경 이미지가 업데이트되었습니다.`,
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveMarker = (markerId: string) => {
    deleteMarker(markerId);
    setActiveMarkerId(null);
    toast({
        title: '스태프가 지도에서 제거되었습니다.',
        description: '미배치 스태프 목록에서 다시 추가할 수 있습니다.'
    })
  }

  // ... (StaffMarker 컴포넌트는 변경 없음, 그대로 사용) ...
  const StaffMarker = ({ marker }: { marker: MapMarker }) => {
    const staffMembers = useMemo(() => staff.filter(s => marker.staffIds?.includes(s.id)), [marker.staffIds, staff]);
    
    if (staffMembers.length === 0) return null;
    const isOpen = activeMarkerId === marker.id;
    const isDraggingThis = draggingMarker?.id === marker.id;

    const mainStaff = staffMembers[0];

    return (
        <Popover open={isOpen} onOpenChange={(open) => { if (!open) setActiveMarkerId(null); }}>
            <PopoverTrigger asChild>
                <div
                    data-marker-id={marker.id}
                    className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform hover:scale-110 touch-none select-none", 
                        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        isDraggingThis && "cursor-grabbing z-50 scale-110",
                        isOpen && "z-40 scale-110"
                    )}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    onPointerDown={(e) => handlePointerDown(e, marker)}
                    onClick={(e) => e.preventDefault()}
                >
                    <div className="relative flex items-center">
                        {staffMembers.slice(0, 3).map((staffMember, index) => (
                            <Avatar 
                                key={staffMember.id}
                                className={cn("h-10 w-10 border-4 border-primary-foreground shadow-lg pointer-events-none transition-colors", 
                                    (isDraggingThis || isOpen) && "border-primary",
                                    index > 0 && "-ml-4"
                                )}
                                style={{
                                    zIndex: staffMembers.length - index
                                }}
                            >
                                <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                                <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ))}
                         {staffMembers.length > 3 && (
                            <div style={{ zIndex: 0 }} className="-ml-4 h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground border-4 border-primary-foreground shadow-lg">
                                +{staffMembers.length - 3}
                            </div>
                        )}
                    </div>
                    {staffMembers.length === 1 && (
                        <div className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium text-center whitespace-nowrap shadow-sm pointer-events-none transition-colors">
                            {mainStaff.name}
                        </div>
                    )}
                </div>
            </PopoverTrigger>
            
            <PopoverContent 
                className="w-96 p-0 overflow-hidden notranslate" 
                sideOffset={10}
                {...{ "translate": "no" } as any}
                onPointerDown={(e) => e.stopPropagation()}
            >
                {/* Popover 내부 내용은 동일 */}
                <div className="p-4 border-b flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold leading-tight flex items-center gap-2 mb-2">
                           <Users className="h-5 w-5 text-primary"/> {staffMembers.length}명의 스태프
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {staffMembers.map(s => (
                                <TooltipProvider key={s.id}>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={s.avatar} alt={s.name} />
                                                <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{s.name}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}
                        </div>
                    </div>

                    <div className='flex flex-col items-center gap-1 -mr-2 -my-2'>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveMarkerId(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                        {isDraggable && !marker.id.startsWith('default-marker') && (
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleRemoveMarker(marker.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>지도에서 제거</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </div>
                
                <div className="p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary">
                       <CalendarClock className='h-4 w-4'/> 현재 시간대 담당 스케줄
                    </h4>
                    <ScrollArea className="h-[200px] pr-2">
                    {(() => {
                        if (!selectedSlot) return null;
                        const staffIds = new Set(staffMembers.map(s => s.id));
                        const relevantSchedules = schedule.filter(s => s.day === selectedSlot.day && s.time === selectedSlot.time && s.staffIds?.some(id => staffIds.has(id)));
                        
                        if (relevantSchedules.length > 0) {
                            return (
                                <div className='space-y-3'>
                                    {relevantSchedules.map(task => (
                                         <div key={task.id} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                             <div className="bg-muted px-3 py-1.5 border-b flex justify-between items-center">
                                                <p className="font-medium text-xs text-muted-foreground">{task.location || 'N/A'}</p>
                                                <p className="font-bold text-xs text-primary">{task.time}</p>
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
                            )
                        }
                        return (
                            <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground gap-2">
                                <CalendarClock className="h-8 w-8 opacity-20" />
                                <p className="text-sm">배정된 업무가 없습니다.</p>
                            </div>
                        )
                    })()}
                    </ScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    )
  }

  const UnassignedStaff = () => {
    // ... (UnassignedStaff 내용은 변경 없음) ...
    const assignedStaffIds = useMemo(() => new Set(currentMarkers.flatMap(m => m.staffIds || [])), [currentMarkers]);
    const unassignedStaff = useMemo(() => staff.filter(s => !assignedStaffIds.has(s.id)), [staff, assignedStaffIds]);
    
    if (unassignedStaff.length === 0 || !isDraggable) return null;

    return (
        <Popover open={isUnassignedPopoverOpen} onOpenChange={setIsUnassignedPopoverOpen}>
            <PopoverTrigger asChild>
                <div className="absolute bottom-4 left-4 z-10">
                    <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        미배치 스태프 <Badge variant="secondary" className="ml-2">{unassignedStaff.length}</Badge>
                    </Button>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-2" side="top" align="start">
                 <div className="flex justify-between items-center mb-2 px-2">
                    <h4 className="font-semibold text-sm">미배치 스태프</h4>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsUnassignedPopoverOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                 </div>
                 <ScrollArea className="h-60">
                    <div className="grid grid-cols-5 gap-2 p-2">
                        {unassignedStaff.map(s => {
                            const staffIndex = staff.findIndex(staffMember => staffMember.id === s.id);
                            return (
                                <TooltipProvider key={s.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative group flex flex-col items-center gap-1 cursor-pointer" onClick={() => handleAddMarkerClick(s.id)}>
                                                 <span className="absolute -top-1 -left-1 z-10 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                                                    {staffIndex + 1}
                                                 </span>
                                                <Avatar className='h-12 w-12 border-2 border-transparent group-hover:border-primary transition-all'>
                                                    <AvatarImage src={s.avatar} alt={s.name} />
                                                    <AvatarFallback><UserPlus className='h-6 w-6 text-muted-foreground'/></AvatarFallback>
                                                </Avatar>
                                            </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{s.name}님을 지도에 추가</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            )
                        })}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
  }
  
  const MapActions = () => {
    // ... (MapActions 변경 없음) ...
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
  
  const NotificationBanner = () => {
    if (!notification || !isBannerVisible) return null;
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-accent/90 backdrop-blur-sm text-accent-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-4 animate-in fade-in-0 slide-in-from-top-4">
            <Megaphone className="h-5 w-5 shrink-0"/>
            <p className="font-semibold text-sm">{notification}</p>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0 -mr-2 text-accent-foreground/70 hover:text-accent-foreground hover:bg-accent-foreground/10"
                onClick={() => setIsBannerVisible(false)}
            >
                <X className="h-4 w-4" />
            </Button>
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

  // 🔴 [핵심 변경] 렌더링 부분 구조 변경
  // 1. 바깥 div: flex-center로 내부의 지도 컨테이너를 중앙 정렬
  // 2. 내부 div (mapRef): aspectRatio 스타일을 적용하여 이미지 비율 강제 고정
  // 3. Image: object-fit: cover로 변경 (부모가 이미 비율을 맞췄으므로 꽉 채움)
  return (
    <div className="w-full h-full bg-slate-50/50 rounded-xl overflow-hidden border shadow-sm flex items-center justify-center p-4">
        <div 
          ref={mapRef}
          className="relative w-full shadow-md notranslate"
          // aspect-ratio 속성을 통해 부모 너비에 맞춰 높이가 자동 조절됨 -> 빈 공간 사라짐
          style={{ aspectRatio: mapAspectRatio }}
          {...{ "translate": "no" } as any}
          onPointerDown={() => setActiveMarkerId(null)}
        >
          {finalMapImageUrl ? (
            <Image
              src={finalMapImageUrl}
              alt="Venue Map"
              fill // layout="fill" (absolute inset-0)
              sizes="(max-width: 768px) 100vw, 80vw"
              className="object-cover pointer-events-none rounded-md" // object-contain -> object-cover
              priority
              // 이미지가 로드되면 실제 비율을 계산하여 상태 업데이트
              onLoadingComplete={(img) => {
                if (img.naturalWidth && img.naturalHeight) {
                    setMapAspectRatio(img.naturalWidth / img.naturalHeight);
                }
              }}
            />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-muted/30">
                <p className="text-muted-foreground">배경 이미지가 없습니다.</p>
            </div>
          )}

          {/* 오버레이 요소들은 mapRef(비율 고정된 박스) 안에 그대로 위치 */}
          <div className="absolute inset-0 bg-black/5 pointer-events-none rounded-md" />
          
          <NotificationBanner />
          <MapActions />
          <UnassignedStaff />

          {currentMarkers.map((marker) => (
             <StaffMarker key={marker.id} marker={marker} />
          ))}
        </div>
    </div>
  );
}