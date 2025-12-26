"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Shield, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isViewerLoading, setIsViewerLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
        if (user.isAnonymous) {
            router.push('/viewer');
        } else {
            router.push('/admin');
        }
    }
  }, [user, isUserLoading, router]);

  const handleAdminLogin = async () => {
    setIsLoggingIn(true);
    if (password === 'camp1') {
      try {
        await signInWithEmailAndPassword(auth, 'admin@venue.sync', password);
        // Successful sign-in is handled by the useEffect
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, 'admin@venue.sync', password);
            // Successful creation is handled by the useEffect
          } catch (createError: any) {
             toast({
                variant: 'destructive',
                title: '관리자 계정 생성 실패',
                description: createError.message,
              });
             setIsLoggingIn(false);
          }
        } else {
            toast({
                variant: 'destructive',
                title: '로그인 오류',
                description: "알 수 없는 오류가 발생했습니다.",
            });
            setIsLoggingIn(false);
        }
      }
    } else {
      toast({
        variant: 'destructive',
        title: '잘못된 비밀번호',
        description: '비밀번호를 확인하고 다시 시도해 주세요.',
      });
      setIsLoggingIn(false);
    }
  };

  const handleViewerAccess = async () => {
    setIsViewerLoading(true);
    try {
      await signInAnonymously(auth);
      // Successful sign-in is handled by the useEffect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '뷰어 접속 실패',
        description: error.message,
      });
      setIsViewerLoading(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
              VenueSync
            </h1>
            <CardDescription>
              실시간 공연장 관리를 손쉽게.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">관리자 비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="관리자 비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                disabled={isLoggingIn || isViewerLoading}
              />
            </div>
            <Button
              onClick={handleAdminLogin}
              className="w-full"
              disabled={isLoggingIn || isViewerLoading}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  확인 중...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  관리자로 로그인
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  또는
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleViewerAccess}
              disabled={isLoggingIn || isViewerLoading}
            >
              {isViewerLoading ? (
                 <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  접속 중...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  뷰어로 계속하기
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
