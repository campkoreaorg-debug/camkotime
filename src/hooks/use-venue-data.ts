"use client";

import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker } from '@/lib/types';
import { initialData } from '@/lib/data';
import { useCallback } from 'react';

const VENUE_ID = 'main-venue'; // Using a single venue for this app

export const useVenueData = () => {
  const firestore = useFirestore();
  const { user } = useUser();

  const venueRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'venues', VENUE_ID) : null),
    [firestore]
  );

  const staffColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'venues', VENUE_ID, 'staff') : null),
    [firestore]
  );

  const scheduleColRef = useMemoFirebase(
    () =>
      firestore
        ? collection(firestore, 'venues', VENUE_ID, 'schedules')
        : null,
    [firestore]
  );

  const markersColRef = useMemoFirebase(
    () =>
      firestore
        ? collection(firestore, 'venues', VENUE_ID, 'markers')
        : null,
    [firestore]
  );

  const { data: venueDoc } = useDoc<any>(venueRef);
  const { data: staff } = useCollection<StaffMember>(staffColRef);
  const { data: schedule } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers } = useCollection<MapMarker>(markersColRef);

  // Function to initialize data if it doesn't exist
  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    
    // Create a batch
    const batch = writeBatch(firestore);

    // Set venue
    const venueDocRef = doc(firestore, 'venues', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', mapImageUrl: initialData.mapImageUrl, ownerId: user.uid });
    
    // Set staff
    initialData.staff.forEach((staffMember) => {
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffMember.id);
        batch.set(staffDocRef, staffMember);
    });

    // Set schedule
    initialData.schedule.forEach((scheduleItem) => {
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleItem.id);
        batch.set(scheduleDocRef, scheduleItem);
    });
    
    // Set markers
    initialData.markers.forEach((marker) => {
        const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', marker.id);
        batch.set(markerDocRef, marker);
    });

    // Commit the batch
    await batch.commit();

  }, [firestore, user]);


  const addStaff = (name: string, avatar: string) => {
    if (!firestore) return;
    const newId = `staff-${Date.now()}`;
    const newStaff: StaffMember = {
      id: newId,
      name,
      role: 'Operations', // Default role
      avatar,
    };
    const newMarker: MapMarker = {
        id: `marker-${Date.now()}`,
        staffId: newId,
        type: 'staff',
        label: newStaff.name,
        x: Math.round(Math.random() * 80) + 10,
        y: Math.round(Math.random() * 80) + 10,
    }
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', newId);
    const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', newMarker.id);
    
    setDocumentNonBlocking(staffDocRef, newStaff, {});
    setDocumentNonBlocking(markerDocRef, newMarker, {});
  };

  const updateStaff = (staffId: string, data: Partial<StaffMember>) => {
    if (!firestore) return;
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    updateDocumentNonBlocking(staffDocRef, data);

    if(data.name){
        const markerToUpdate = markers?.find(m => m.staffId === staffId);
        if(markerToUpdate){
            const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', markerToUpdate.id);
            updateDocumentNonBlocking(markerDocRef, { label: data.name });
        }
    }
  };

  const deleteStaff = (staffId: string) => {
    if (!firestore) return;
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    deleteDocumentNonBlocking(staffDocRef);

    const markerToDelete = markers?.find(m => m.staffId === staffId);
    if(markerToDelete){
        const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', markerToDelete.id);
        deleteDocumentNonBlocking(markerDocRef);
    }
  };

  const addSchedule = (values: Omit<ScheduleItem, 'id'>) => {
    if (!firestore) return;
    const newId = `sch-${Date.now()}`;
    const newScheduleItem: ScheduleItem = { id: newId, ...values };
    const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
    setDocumentNonBlocking(scheduleDocRef, newScheduleItem, {});
  };

  const updateSchedule = (scheduleId: string, data: Partial<ScheduleItem>) => {
    if (!firestore) return;
    const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
    updateDocumentNonBlocking(scheduleDocRef, data);
  };

  const deleteSchedule = (scheduleId: string) => {
    if (!firestore) return;
    const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
    deleteDocumentNonBlocking(scheduleDocRef);
  };
  
  const updateMapImage = (newUrl: string) => {
      if(!venueRef) return;
      updateDocumentNonBlocking(venueRef, { mapImageUrl: newUrl });
  }

  const data: VenueData = {
    staff: staff || [],
    schedule: schedule ? [...schedule].sort((a,b) => a.time.localeCompare(b.time)) : [],
    markers: markers || [],
    mapImageUrl: venueDoc?.mapImageUrl,
  };

  return { data, addStaff, updateStaff, deleteStaff, addSchedule, updateSchedule, deleteSchedule, updateMapImage, initializeFirestoreData, isLoading: !venueDoc || !staff || !schedule || !markers };
};
