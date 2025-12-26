"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SchedulePanel } from '@/components/admin/SchedulePanel';
import { StaffPanel } from '@/components/admin/StaffPanel';
import VenueMap from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { LogOut, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';

export default function AdminPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { data, updateMapImage, initializeFirestoreData, isLoading, updateMarkerPosition } = useVenueData();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // If data is empty, it might be the first time.
    // Let's initialize it.
    if(user && data.staff.length === 0 && !isLoading){
        initializeFirestoreData();
    }
  }, [data, user, isLoading, initializeFirestoreData]);

  const handleLogout = async () => {
    await auth.signOut();
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
        updateMapImage(newMapImageUrl);
        toast({
          title: '성공',
          description: '지도 배경 이미지가 업데이트되었습니다.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isUserLoading || !user || isLoading) {
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
        <main className="p-4 md:p-8 space-y-8">
            {/* Schedule Panel */}
            <SchedulePanel />

            {/* Staff Panel */}
            <StaffPanel />

            {/* Map Section */}
            <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-headline font-semibold">지도 보기</h2>
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
                 <VenueMap 
                    markers={data.markers} 
                    staff={data.staff} 
                    schedule={data.schedule}
                    mapImageUrl={data.mapImageUrl}
                    onMarkerDragEnd={updateMarkerPosition} 
                    isDraggable={true}
                 />
            </div>
        </main>
    </div>
  );
}
