'use client';

import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';
import Image from 'next/image';
import { MapPin, CalendarClock } from 'lucide-react';
import type { MapMarker, StaffMember, ScheduleItem } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

interface VenueMapProps {
  markers: MapMarker[];
  staff: StaffMember[];
  schedule: ScheduleItem[];
  mapImageUrl?: string;
  isDraggable?: boolean;
  onMarkerDragEnd?: (markerId: string, x: number, y: number) => void;
}

export function VenueMap({ markers, staff, schedule, mapImageUrl, isDraggable = false, onMarkerDragEnd }: VenueMapProps) {
  const defaultMapImage = PlaceHolderImages.find((img) => img.id === 'map-background');
  const finalMapImageUrl = mapImageUrl || defaultMapImage?.imageUrl;

  const mapRef = useRef<HTMLDivElement>(null);
  const [draggingMarker, setDraggingMarker] = useState<string | null>(null);

  const handleDragStart = (e: MouseEvent | TouchEvent, markerId: string) => {
    if (!isDraggable) return;
    e.preventDefault();
    setDraggingMarker(markerId);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!draggingMarker || !mapRef.current) return;
    e.preventDefault();

    const mapBounds = mapRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    let x = ((clientX - mapBounds.left) / mapBounds.width) * 100;
    let y = ((clientY - mapBounds.top) / mapBounds.height) * 100;

    // Clamp values between 0 and 100
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    const markerElement = mapRef.current.querySelector(`[data-marker-id="${draggingMarker}"]`) as HTMLElement;
    if (markerElement) {
        markerElement.style.left = `${x}%`;
        markerElement.style.top = `${y}%`;
    }
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent) => {
    if (!draggingMarker || !mapRef.current) return;
    e.preventDefault();

    const mapBounds = mapRef.current.getBoundingClientRect();
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    
    let x = ((clientX - mapBounds.left) / mapBounds.width) * 100;
    let y = ((clientY - mapBounds.top) / mapBounds.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    onMarkerDragEnd?.(draggingMarker, x, y);
    setDraggingMarker(null);
  };

  return (
    <div className="w-full h-full p-4 bg-card rounded-lg shadow-inner overflow-hidden">
        <div 
          ref={mapRef}
          className="relative w-full aspect-[3/2] rounded-lg overflow-hidden border"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {finalMapImageUrl && (
            <Image
              src={finalMapImageUrl}
              alt="Venue Map"
              fill
              className="object-cover"
              data-ai-hint={!mapImageUrl ? defaultMapImage?.imageHint : 'custom venue map'}
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          {markers.filter(marker => marker.type === 'staff').map((marker) => {
            const staffMember = marker.staffId ? staff.find(s => s.id === marker.staffId) : undefined;
            const staffIndex = staffMember ? staff.findIndex(s => s.id === staffMember.id) : -1;
            const staffNumber = staffIndex !== -1 ? staffIndex + 1 : null;
            
            if (!staffMember) return null; // If staff member not found, don't render marker

            const staffTasks = schedule.filter(task => task.staffId === staffMember.id);

            return (
                <Popover key={marker.id}>
                    <PopoverTrigger asChild>
                        <div
                            data-marker-id={marker.id}
                            className={cn(
                                "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer",
                                isDraggable && "cursor-grab",
                                draggingMarker === marker.id && "cursor-grabbing z-10"
                            )}
                            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                            onMouseDown={(e) => handleDragStart(e, marker.id)}
                            onTouchStart={(e) => handleDragStart(e, marker.id)}
                        >
                            <Avatar className="h-10 w-10 border-2 border-primary-foreground shadow-lg">
                                <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                                <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="mt-1 px-2 py-0.5 bg-black/60 rounded-md text-white text-xs text-center whitespace-nowrap">
                                {staffNumber}. {staffMember.name}
                            </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                                <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="text-lg font-semibold">{staffMember.name}</h3>
                                <p className="text-sm text-muted-foreground">{staffMember.role}</p>
                            </div>
                        </div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                           <CalendarClock className='h-4 w-4 text-muted-foreground'/> 담당 스케줄
                        </h4>
                        <ScrollArea className="h-[200px]">
                        {staffTasks.length > 0 ? (
                            <div className='space-y-2 pr-4'>
                                {staffTasks.map(task => (
                                    <div key={task.id} className="p-2 border rounded-md bg-muted/30">
                                        <p className="font-semibold text-xs">{task.day}일차 {task.time}</p>
                                        <p className="text-sm">{task.event}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                배정된 업무가 없습니다.
                            </div>
                        )}
                        </ScrollArea>
                    </PopoverContent>
                </Popover>
            )
          })}
        </div>
    </div>
  );
}
