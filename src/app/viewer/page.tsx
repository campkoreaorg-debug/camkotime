"use client";

import Link from 'next/link';
import { VenueMap } from '@/components/VenueMap';
import { useVenueData } from '@/hooks/use-venue-data';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function ViewerPage() {
  const { data } = useVenueData();

  return (
    <div className="min-h-screen flex flex-col">
       <header className='flex justify-between items-center p-4 border-b bg-card shadow-sm'>
            <h1 className='font-headline text-2xl font-bold text-primary'>VenueSync Map</h1>
            <Button variant="outline" asChild>
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
        </header>
        <main className="flex-grow p-4 md:p-8">
            <VenueMap markers={data.markers} staff={data.staff} />
        </main>
    </div>
  );
}
