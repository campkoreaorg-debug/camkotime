"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { VenueMap } from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { Home, Loader2, Database } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';

export default function ViewerPage() {
  // 데이터 불러오기 훅 (초기화 함수 포함)
  const { data, isLoading, initializeFirestoreData } = useVenueData();
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

  // 1. 유저 정보 확인 중일 때
  if(isUserLoading){
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  // 2. 데이터 로딩 중 (또는 데이터 없음) 일 때
  // -> 여기서 무한 로딩에 빠지지 않도록 '초기 데이터 생성' 버튼을 보여줍니다.
  if(isLoading){
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">데이터를 확인하고 있습니다...</p>
            
            {/* 데이터가 없어서 로딩이 안 끝나는 경우를 위한 버튼 */}
            <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border p-4 shadow-sm bg-card">
                <p className="text-sm font-medium text-red-500">
                    화면이 계속 로딩 중인가요?
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                   데이터베이스가 비어있을 수 있습니다.
                </p>
                <Button 
                    onClick={() => initializeFirestoreData()} 
                    variant="secondary"
                >
                    {/* 번역기 충돌 방지용 span */}
                    <span className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>초기 데이터 생성하기</span>
                    </span>
                </Button>
            </div>
        </div>
    )
  }

  // 3. 정상 렌더링 (지도가 보이는 화면)
  return (
    <div className="min-h-screen flex flex-col">
       <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <h1 className='font-headline text-2xl font-bold text-primary'>VenueSync 지도</h1>
            <Button variant="outline" onClick={handleReturnHome}>
                {/* 번역기 충돌 방지용 span */}
                <span className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>홈으로 돌아가기</span>
                </span>
            </Button>
       </header>
       <main className="flex-grow p-4 md:p-8">
           <VenueMap 
            markers={data.markers} 
            staff={data.staff} 
            schedule={data.schedule}
            mapImageUrl={data.mapImageUrl} 
            isDraggable={false}
           />
       </main>
    </div>
  );
}
