
"use client";

import { SessionProvider } from '@/hooks/use-session';
import { SessionSelector } from '@/components/admin/SessionSelector';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { PublicSessionSelector } from '@/components/admin/PublicSessionSelector';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await auth.signOut();
        localStorage.removeItem('activeSessionId');
        router.push('/');
    };

    return (
        <SessionProvider>
            <div className="min-h-screen bg-background">
                <header className='flex justify-between items-center p-4 border-b bg-card'>
                    <div className="flex items-center gap-4">
                        <h1 className='font-headline text-2xl font-bold text-primary'>VenueSync 대시보드</h1>
                        <SessionSelector />
                    </div>
                    <div className="flex items-center gap-4">
                        <PublicSessionSelector />
                        <Button variant="ghost" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            로그아웃
                        </Button>
                    </div>
                </header>
                <main>{children}</main>
            </div>
        </SessionProvider>
    );
}
