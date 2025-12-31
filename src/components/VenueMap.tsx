

'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { CalendarClock, X, UserPlus, Upload, Megaphone, Trash2, Users } from 'lucide-react';
import type { MapMarker, StaffMember, ScheduleItem, MapInfo, Position } from '@/lib/types';
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
import { useDrop, DropTargetMonitor } from 'react-dnd';

interface VenueMapProps {
  allMarkers: MapMarker[];
  allMaps: MapInfo[];
  staff: StaffMember[];
  schedule: ScheduleItem[];
  isDraggable?: boolean;
  selectedSlot: { day: number, time: string } | null;
  notification?: string;
}

const ItemTypes = {
    POSITION: 'position',
}

export default function VenueMap({ allMarkers, allMaps, staff, schedule, isDraggable = false, selectedSlot, notification }: VenueMapProps) {
  const { updateMarkerPosition, addMarker, updateMapImage, deleteMarker, assignPositionToStaff } = useVenueData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

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
    
    // 1. Get all staff IDs who have a schedule at this time slot
    const scheduledStaffIds = new Set(
        schedule
            .filter(s => s.day === selectedSlot.day && s.time === selectedSlot.time)
            .flatMap(s => s.staffIds)
    );

    // 2. Get all markers that are specifically for this time slot
    const timeSpecificMarkers = allMarkers.filter(m => m.day === selectedSlot.day && m.time === selectedSlot.time);
    
    // 3. Create a set of staff IDs that already have a marker
    const staffWithMarkers = new Set(timeSpecificMarkers.flatMap(m => m.staffIds));
    
    const markersToShow = [...timeSpecificMarkers];

    // 4. For scheduled staff who DON'T have a marker, create a default one
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
  
  const handleRemoveMarker = (markerId: string) => {
    deleteMarker(markerId);
    setActiveMarkerId(null);
    toast({
        title: '스태프가 지도에서 제거되었습니다.',
        description: '미배치 스태프 목록에서 다시 추가할 수 있습니다.'
    })
  }

  const StaffMarker = ({ marker }: { marker: MapMarker }) => {
    const staffMembers = useMemo(() => staff.filter(s => marker.staffIds?.includes(s.id)), [marker.staffIds, staff]);
    
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.POSITION,
        drop: (item: Position) => {
            if (staffMembers.length > 0) {
                staffMembers.forEach(staffMember => {
                    assignPositionToStaff(staffMember.id, item);
                })
                toast({
                    title: '포지션 할당됨',
                    description: `${staffMembers.map(s=>s.name).join(', ')}님에게 '${item.name}' 포지션이 할당되었습니다.`,
                });
            }
        },
        collect: (monitor: DropTargetMonitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [staffMembers]);

    if (staffMembers.length === 0) return null;
    const isOpen = activeMarkerId === marker.id;
    const isDraggingThis = draggingMarker?.id === marker.id;

    const mainStaff = staffMembers[0];
    const positionColor = mainStaff.position?.color;

    return (
        <Popover open={isOpen} onOpenChange={(open) => { if (!open) setActiveMarkerId(null); }}>
            <PopoverTrigger asChild>
                <div
                    ref={drop}
                    data-marker-id={marker.id}
                    className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform hover:scale-110 touch-none select-none", 
                        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                        isDraggingThis && "cursor-grabbing z-50 scale-110",
                        isOpen && "z-40 scale-110",
                        isOver && canDrop && 'scale-125'
                    )}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    onPointerDown={(e) => handlePointerDown(e, marker)}
                    onClick={(e) => e.preventDefault()}
                >
                    <div className="relative flex items-center">
                        {staffMembers.slice(0, 3).map((staffMember, index) => (
                            <Avatar 
                                key={staffMember.id}
                                className={cn("h-10 w-10 border-4 shadow-lg pointer-events-none transition-colors", 
                                    (isDraggingThis || isOpen || isOver) && "border-primary",
                                    isOver && canDrop && 'ring-4 ring-offset-2 ring-primary',
                                    index > 0 && "-ml-4"
                                )}
                                style={{
                                    zIndex: staffMembers.length - index,
                                    borderColor: isOver && canDrop ? 'hsl(var(--primary))' : staffMember.position?.color ? staffMember.position?.color : 'hsl(var(--primary-foreground))'
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
                        <div className={cn("mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium text-center whitespace-nowrap shadow-sm pointer-events-none transition-colors",
                            mainStaff.position && "text-white"
                        )}
                        style={{ backgroundColor: mainStaff.position ? mainStaff.position.color : 'rgba(0,0,0,0.6)'}}
                        >
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
                        const relevantSchedules = schedule.filter(s => s.day === selectedSlot.day && s.time === selectedSlot.time && s.staffIds.some(id => staffIds.has(id)));
                        
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
    const assignedStaffIds = useMemo(() => new Set(currentMarkers.flatMap(m => m.staffIds)), [currentMarkers]);
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
              sizes="90vw" 
              className="object-contain pointer-events-none"
              priority
            />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground">배경 이미지가 없습니다.</p>
            </div>
          )}

          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          
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
