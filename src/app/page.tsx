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
                title: 'Login Failed',
                description: 'Could not access session storage. Please enable cookies and try again.',
            });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Incorrect Password',
          description: 'Please check the password and try again.',
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
              Real-time venue management at your fingertips.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
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
              {isLoading ? 'Verifying...' : 'Login as Admin'}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleViewerAccess}
            >
              <Eye className="mr-2 h-4 w-4" />
              Continue as Viewer
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
