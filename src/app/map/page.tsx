
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { timeSlots } from '@/components/admin/SchedulePanel';
import { Button } from '@/components/ui/button';

export default function MapPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { data, isLoading } = useVenueData();
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);

  useEffect(() => {
    // Allow anonymous users to see the map, but redirect if not logged in at all
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
      if (storedSlot) {
        setSelectedSlot(JSON.parse(storedSlot));
      } else {
        // [수정됨] localStorage에 값이 없으면 기본값 설정
        setSelectedSlot({ day: 0, time: '07:00' });
      }
    };
    
    // Initial load from localStorage
    handleStorageChange();

    // Listen for changes from other tabs
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (isUserLoading || isLoading || !selectedSlot) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Determine if the map should be draggable.
  // Only non-anonymous (admin) users should be able to drag.
  const isDraggable = user ? !user.isAnonymous : false;
  
  const currentDay = selectedSlot?.day ?? 0;
  
  const handleSelectSlot = (day: number, time: string) => {
    const newSlot = { day, time };
    setSelectedSlot(newSlot);
    localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(newSlot));
  }


  return (
    <div className="h-screen w-screen bg-background p-4 flex flex-col">
       <h1 className='text-2xl font-bold text-center mb-4 text-primary shrink-0'>
          VenueSync 실시간 지도 (Day {selectedSlot.day} - {selectedSlot.time})
       </h1>
        <div className="flex flex-wrap gap-2 pb-4 mb-4 border-b shrink-0 justify-center">
            {timeSlots.map(time => {
                const isSelected = selectedSlot?.day === currentDay && selectedSlot?.time === time;
                return (
                <Button 
                    key={time} 
                    variant={isSelected ? "default" : "outline"}
                    className="flex-shrink-0 text-xs h-8"
                    onClick={() => handleSelectSlot(currentDay, time)}
                >
                    {time}
                </Button>
                )
            })}
        </div>
       <div className='w-full grow'>
          <VenueMap
            allMarkers={data.markers}
            allMaps={data.maps}
            staff={data.staff}
            schedule={data.schedule}
            isDraggable={isDraggable}
            selectedSlot={selectedSlot}
          />
      </div>
    </div>
  );
}
