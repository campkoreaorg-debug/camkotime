
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';

export default function MapPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { data, isLoading, updateMarkerPosition } = useVenueData();

  useEffect(() => {
    // Allow anonymous users to see the map, but redirect if not logged in at all
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine if the map should be draggable.
  // Only non-anonymous (admin) users should be able to drag.
  const isDraggable = user ? !user.isAnonymous : false;

  return (
    <div className="h-screen w-screen bg-background">
      <VenueMap
        markers={data.markers}
        staff={data.staff}
        schedule={data.schedule}
        mapImageUrl={data.mapImageUrl}
        onMarkerDragEnd={updateMarkerPosition}
        isDraggable={isDraggable}
      />
    </div>
  );
}
