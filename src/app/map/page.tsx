
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Loader2, Home } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { timeSlots } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function MapPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { data, isLoading } = useVenueData();
  
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('day-0');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSlot = localStorage.getItem('venueSyncSelectedSlot');
      if (storedSlot) {
        const parsedSlot = JSON.parse(storedSlot);
        setSelectedSlot(parsedSlot);
        setActiveTab(`day-${parsedSlot.day}`);
      } else {
        const defaultSlot = { day: 0, time: '07:00' };
        setSelectedSlot(defaultSlot);
        setActiveTab('day-0');
      }
    };
    
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleReturnHome = async () => {
    await auth.signOut();
    localStorage.removeItem('venueSyncSelectedSlot');
    router.push('/');
  }

  const handleTabChange = (newTab: string) => {
    const newDay = parseInt(newTab.split('-')[1], 10);
    setActiveTab(newTab);
    if(selectedSlot) {
      handleSelectSlot(newDay, selectedSlot.time);
    }
  }

  const handleSelectSlot = (day: number, time: string) => {
    const newSlot = { day, time };
    setSelectedSlot(newSlot);
    localStorage.setItem('venueSyncSelectedSlot', JSON.stringify(newSlot));
    setSelectedStaffId(null);
  }

  if (isUserLoading || isLoading || !selectedSlot) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDraggable = user ? !user.isAnonymous : false;
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background">
         <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
              <h1 className='font-headline text-2xl font-bold text-primary'>
                  VenueSync 실시간 지도 (Day {selectedSlot.day} - {selectedSlot.time})
              </h1>
              <Button variant="outline" onClick={handleReturnHome}>
                  <Home className="mr-2 h-4 w-4" />
                  홈으로 돌아가기
              </Button>
        </header>

         <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 md:p-8">
            <div className="lg:col-span-1 space-y-4">
               <Tabs value={activeTab} onValueChange={handleTabChange} className="px-1">
                  <TabsList className='mb-2'>
                    {Array.from({length: 4}, (_, i) => i).map(day => (
                      <TabsTrigger key={day} value={`day-${day}`}>{day}일차</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="flex flex-wrap gap-2 pb-2">
                    {timeSlots.map(time => {
                      const day = parseInt(activeTab.split('-')[1], 10);
                      const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                      return (
                        <Button 
                            key={time} 
                            variant={isSelected ? "default" : "outline"}
                            className="flex-shrink-0 text-xs h-8"
                            onClick={() => handleSelectSlot(day, time)}
                        >
                            {time}
                        </Button>
                      )
                    })}
                </div>
                {isDraggable && (
                  <StaffPanel
                    selectedSlot={selectedSlot}
                    onStaffSelect={setSelectedStaffId}
                    selectedStaffId={selectedStaffId}
                  />
                )}
            </div>

            <div className='w-full lg:col-span-2'>
              <VenueMap
                allMarkers={data.markers}
                allMaps={data.maps}
                staff={data.staff}
                schedule={data.schedule}
                isDraggable={isDraggable}
                selectedSlot={selectedSlot}
                notification={data.notification}
              />
            </div>
         </main>
      </div>
    </DndProvider>
  );
}
