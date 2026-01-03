
"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { useVenueData } from '@/hooks/use-venue-data';
import { ScheduleTable } from '@/components/admin/ScheduleTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function ScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  
  const { data, isLoading } = useVenueData(sid); 
  const { user, isUserLoading } = useUser();

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

  if(!data){
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
             <h2 className="text-xl font-semibold">데이터 없음</h2>
            <p className="text-muted-foreground">
               {sid ? '선택된 차수에 데이터가 없습니다.' : '차수 정보(ID)를 찾을 수 없습니다.'}
            </p>
        </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
        <h1 className='font-headline text-3xl font-bold text-primary'>
            VenueSync 전체 스케줄
        </h1>
        <Card>
            <CardHeader>
                <CardTitle>전체 스케줄</CardTitle>
                <CardDescription>모든 날짜와 시간의 스케줄을 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScheduleTable schedule={data.schedule} staff={data.staff} />
            </CardContent>
        </Card>
    </div>
  );
}

function SchedulePageWrapper() {
  const searchParams = useSearchParams();
  const sid = searchParams.get('sid');
  const { setSessionId, sessionId: contextSessionId } = useSession();

  useEffect(() => {
    if (sid && sid !== contextSessionId) {
      setSessionId(sid);
    }
  }, [sid, contextSessionId, setSessionId]);
  
  if (!contextSessionId && sid) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return <ScheduleContent />;
}


export default function SchedulePage() {
  return (
    <SessionProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <SchedulePageWrapper />
      </Suspense>
    </SessionProvider>
  )
}

    