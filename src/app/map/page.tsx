
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { timeSlots } from '@/components/admin/SchedulePanel';

export default function MapPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { data, isLoading } = useVenueData();
  const [currentTimeSlot, setCurrentTimeSlot] = useState<{ day: number; time: string } | null>(null);

  useEffect(() => {
    // Allow anonymous users to see the map, but redirect if not logged in at all
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const now = new Date();
    const currentDay = 0; // Assuming Day 0 for viewer for now
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    let timeString: string;
    if (minutes < 30) {
      timeString = `${String(hours).padStart(2, '0')}:00`;
    } else {
      timeString = `${String(hours).padStart(2, '0')}:30`;
    }

    if (timeSlots.includes(timeString)) {
      setCurrentTimeSlot({ day: currentDay, time: timeString });
    } else if (timeSlots.length > 0) {
      setCurrentTimeSlot({ day: currentDay, time: timeSlots[0] });
    }
  }, []);

  if (isUserLoading || isLoading || !currentTimeSlot) {
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
    <div className="h-screen w-screen bg-background p-4">
       <h1 className='text-2xl font-bold text-center mb-4 text-primary'>
          VenueSync 실시간 지도 (Day {currentTimeSlot.day} - {currentTimeSlot.time})
       </h1>
       <div className='w-full h-[calc(100vh-80px)]'>
          <VenueMap
            allMarkers={data.markers}
            allMaps={data.maps}
            staff={data.staff}
            schedule={data.schedule}
            isDraggable={isDraggable}
            selectedSlot={currentTimeSlot}
          />
      </div>
    </div>
  );
}
