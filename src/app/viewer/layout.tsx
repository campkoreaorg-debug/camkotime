
"use client";
import { SessionProvider } from '@/hooks/use-session';

export default function ViewerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    );
}
