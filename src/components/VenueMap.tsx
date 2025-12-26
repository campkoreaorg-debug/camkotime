'use client';

import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import type { MapMarker, StaffMember } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface VenueMapProps {
  markers: MapMarker[];
  staff: StaffMember[];
  mapImageUrl?: string;
  isDraggable?: boolean;
  onMarkerDragEnd?: (markerId: string, x: number, y: number) => void;
}

export function VenueMap({ markers, staff, mapImageUrl, isDraggable = false, onMarkerDragEnd }: VenueMapProps) {
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
      <TooltipProvider>
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
          {markers.map((marker) => {
            const staffMember = marker.staffId ? staff.find(s => s.id === marker.staffId) : undefined;
            
            return (
                <Tooltip key={marker.id}>
                    <TooltipTrigger asChild>
                    <div
                        data-marker-id={marker.id}
                        className={cn(
                            "absolute -translate-x-1/2 -translate-y-1/2",
                            isDraggable && "cursor-grab",
                            draggingMarker === marker.id && "cursor-grabbing z-10"
                        )}
                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                        onMouseDown={(e) => handleDragStart(e, marker.id)}
                        onTouchStart={(e) => handleDragStart(e, marker.id)}
                    >
                        {marker.type === 'staff' && staffMember ? (
                            <Avatar className="h-10 w-10 border-2 border-primary-foreground shadow-lg">
                                <AvatarImage src={staffMember.avatar} alt={staffMember.name} />
                                <AvatarFallback>{staffMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="relative">
                                <MapPin className="h-8 w-8 text-accent drop-shadow-lg" fill="hsl(var(--accent))" stroke="white" strokeWidth={1.5} />
                            </div>
                        )}
                    </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className='flex items-center gap-2'>
                        <p className="font-semibold">{marker.label}</p>
                        {staffMember && <Badge variant="secondary">{staffMember.role}</Badge>}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
