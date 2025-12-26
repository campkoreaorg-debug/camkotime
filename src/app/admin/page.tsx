"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import { VenueMap } from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Calendar, Users, Map, LogOut, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { data } = useVenueData();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    try {
        const isAdmin = sessionStorage.getItem('is-admin') === 'true';
        if (!isAdmin) {
          router.replace('/');
        } else {
          setIsAuthenticated(true);
        }
    } catch (error) {
        // If sessionStorage is not available, redirect
        router.replace('/');
    }
  }, [router]);

  const handleLogout = () => {
    try {
        sessionStorage.removeItem('is-admin');
    } catch (error) {
        console.error("Could not remove item from session storage.")
    }
    router.push('/');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
        <header className='flex justify-between items-center p-4 border-b bg-card'>
            <h1 className='font-headline text-2xl font-bold text-primary'>VenueSync 대시보드</h1>
            <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
            </Button>
        </header>
      <main className="p-4 md:p-8">
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="map">
              <Map className="mr-2 h-4 w-4" />
              지도 보기
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="mr-2 h-4 w-4" />
              스태프
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="mr-2 h-4 w-4" />
              스케줄
            </TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="mt-4">
             <VenueMap markers={data.markers} staff={data.staff} />
          </TabsContent>
          <TabsContent value="staff" className="mt-4">
            <StaffPanel />
          </TabsContent>
          <TabsContent value="schedule" className="mt-4">
            <SchedulePanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
