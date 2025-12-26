'use client';

import Image from 'next/image';
import { Shield, User, MapPin, BriefcaseMedical } from 'lucide-react';
import type { MapMarker, StaffMember, Role, RoleKorean } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface VenueMapProps {
  markers: MapMarker[];
  staff: StaffMember[];
}

const getIconForRole = (role: StaffMember['role']) => {
  switch (role) {
    case 'Security':
      return <Shield className="h-5 w-5 text-white" />;
    case 'Medical':
      return <BriefcaseMedical className="h-5 w-5 text-white" />;
    default:
      return <User className="h-5 w-5 text-white" />;
  }
};

const getBgForRole = (role: StaffMember['role']) => {
    switch (role) {
      case 'Security':
        return 'bg-blue-600';
      case 'Medical':
        return 'bg-red-600';
      case 'Operations':
        return 'bg-yellow-600';
      case 'Info':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
}

const roleToKorean: Record<Role, RoleKorean> = {
    'Security': '보안',
    'Medical': '의료',
    'Operations': '운영',
    'Info': '안내'
}

export function VenueMap({ markers, staff }: VenueMapProps) {
  const mapImage = PlaceHolderImages.find((img) => img.id === 'map-background');

  return (
    <div className="w-full h-full p-4 bg-card rounded-lg shadow-inner overflow-hidden">
      <TooltipProvider>
        <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden border">
          {mapImage && (
            <Image
              src={mapImage.imageUrl}
              alt={mapImage.description}
              fill
              className="object-cover"
              data-ai-hint={mapImage.imageHint}
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
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                        {marker.type === 'staff' && staffMember ? (
                        <div className={cn("rounded-full h-8 w-8 flex items-center justify-center shadow-lg ring-2 ring-white", getBgForRole(staffMember.role))}>
                            {getIconForRole(staffMember.role)}
                        </div>
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
                        {staffMember && <Badge variant="secondary">{roleToKorean[staffMember.role]}</Badge>}
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
