"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { VenueMap } from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { Home, Loader2 } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';


export default function ViewerPage() {
  const { data, isLoading } = useVenueData();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleReturnHome = async () => {
    await auth.signOut();
    router.push('/');
  }

  useEffect(() => {
    if(!isUserLoading && !user){
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if(isUserLoading || isLoading){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
       <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <h1 className='font-headline text-2xl font-bold text-primary'>VenueSync 지도</h1>
            <Button variant="outline" onClick={handleReturnHome}>
                <Home className="mr-2 h-4 w-4" />
                홈으로 돌아가기
            </Button>
        </header>
        <main className="flex-grow p-4 md:p-8">
            <VenueMap markers={data.markers} staff={data.staff} mapImageUrl={data.mapImageUrl} />
        </main>
    </div>
  );
}
