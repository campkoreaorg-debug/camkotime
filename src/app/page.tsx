"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Shield } from 'lucide-react';

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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = () => {
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      if (password === 'camp1') {
        try {
            sessionStorage.setItem('is-admin', 'true');
            router.push('/admin');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: '로그인 실패',
                description: '세션 저장소에 접근할 수 없습니다. 쿠키를 활성화하고 다시 시도해 주세요.',
            });
        }
      } else {
        toast({
          variant: 'destructive',
          title: '잘못된 비밀번호',
          description: '비밀번호를 확인하고 다시 시도해 주세요.',
        });
      }
      setIsLoading(false);
    }, 500);
  };

  const handleViewerAccess = () => {
    router.push('/viewer');
  };

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
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleAdminLogin}
              className="w-full"
              disabled={isLoading}
            >
              <Shield className="mr-2 h-4 w-4" />
              {isLoading ? '확인 중...' : '관리자로 로그인'}
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
            >
              <Eye className="mr-2 h-4 w-4" />
              뷰어로 계속하기
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
