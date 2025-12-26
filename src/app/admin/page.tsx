"use client";

import { useEffect, useState, useRef } from 'react';
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
import { Calendar, Users, Map, LogOut, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const router = useRouter();
  const { data, updateData } = useVenueData();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(data.mapImageUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
        const isAdmin = sessionStorage.getItem('is-admin') === 'true';
        if (!isAdmin) {
          router.replace('/');
        } else {
          setIsAuthenticated(true);
        }
    } catch (error) {
        router.replace('/');
    }
  }, [router]);
  
  useEffect(() => {
    setMapImageUrl(data.mapImageUrl);
  }, [data.mapImageUrl]);

  const handleLogout = () => {
    try {
        sessionStorage.removeItem('is-admin');
    } catch (error) {
        console.error("Could not remove item from session storage.")
    }
    router.push('/');
  };

  const handleMapImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        updateData({ ...data, mapImageUrl: newMapImageUrl });
        setMapImageUrl(newMapImageUrl);
        toast({
          title: '성공',
          description: '지도 배경 이미지가 업데이트되었습니다.',
        });
      };
      reader.readAsDataURL(file);
    }
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
            <div className="flex justify-end mb-4">
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
             <VenueMap markers={data.markers} staff={data.staff} mapImageUrl={mapImageUrl} />
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
