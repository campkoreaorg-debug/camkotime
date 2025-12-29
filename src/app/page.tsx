
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

  // [리다이렉트] 이미 로그인 되어 있으면 해당 페이지로 보냄
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
    
    // [수정됨] 비밀번호를 'camp123'으로 변경
    if (password === 'camp123') {
      try {
        // 이제 입력한 password(camp123)를 그대로 사용합니다.
        await signInWithEmailAndPassword(auth, 'admin@venue.sync', password);
        // 성공하면 useEffect에서 알아서 이동시킴
      } catch (error: any) {
        // 계정이 없으면 새로 생성 시도
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, 'admin@venue.sync', password);
            toast({
                title: "관리자 계정 생성됨",
                description: "초기 관리자 계정이 생성되었습니다.",
            });
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '뷰어 접속 실패',
        description: error.message,
      });
      setIsViewerLoading(false);
    }
  };
  
  // 로딩 화면
  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">로그인 상태 확인 중...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">
              캠프코리아
            </h1>
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
            
            {/* 번역기 에러 방지를 위해 span으로 감쌈 */}
            <Button
              onClick={handleAdminLogin}
              className="w-full"
              disabled={isLoggingIn || isViewerLoading}
            >
              {isLoggingIn ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>확인 중...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>관리자로 로그인</span>
                </span>
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
                  스태프는 뷰어로 계속하기를 눌러주세요
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
                 <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>접속 중...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>뷰어로 계속하기</span>
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
