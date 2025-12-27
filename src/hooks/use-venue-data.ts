
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
  deleteDoc,
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo } from '@/lib/types';
import { initialData } from '@/lib/data';
import { useCallback, useMemo } from 'react';

const VENUE_ID = 'main-venue'; // Using a single venue for this app

type ClipboardItem = Omit<ScheduleItem, 'id' | 'day' | 'time'>;

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
  
  const mapsColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'venues', VENUE_ID, 'maps') : null),
    [firestore]
  );

  const { data: venueDoc } = useDoc<any>(venueRef);
  const { data: staff } = useCollection<StaffMember>(staffColRef);
  const { data: schedule } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers } = useCollection<MapMarker>(markersColRef);
  const { data: maps } = useCollection<MapInfo>(mapsColRef);

  // Function to initialize data if it doesn't exist
  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    
    // Create a batch
    const batch = writeBatch(firestore);

    // Set venue
    const venueDocRef = doc(firestore, 'venues', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid });
    
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
    
    // Set maps
    initialData.maps.forEach((map) => {
        const mapDocRef = doc(firestore, 'venues', VENUE_ID, 'maps', map.id);
        batch.set(mapDocRef, map);
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
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', newId);
    setDocumentNonBlocking(staffDocRef, newStaff, {});
  };

  const addStaffBatch = async (newStaffMembers: { name: string; avatar: string }[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const timestamp = Date.now();

    newStaffMembers.forEach((member, index) => {
        const staffId = `staff-${timestamp}-${index}`;
        const newStaff: StaffMember = {
            id: staffId,
            name: member.name,
            role: 'Operations',
            avatar: member.avatar,
        };
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
        batch.set(staffDocRef, newStaff);
    });

    await batch.commit();
  };

  const updateStaff = (staffId: string, data: Partial<StaffMember>) => {
    if (!firestore) return;
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    updateDocumentNonBlocking(staffDocRef, data);
  };

  const deleteStaff = async (staffId: string) => {
    if (!firestore) return;
    
    // Create a batch to delete staff and their associated markers
    const batch = writeBatch(firestore);

    // Delete staff member
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.delete(staffDocRef);

    // Find and delete all markers for this staff member
    const staffMarkers = markers?.filter(m => m.staffId === staffId) || [];
    staffMarkers.forEach(marker => {
      const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', marker.id);
      batch.delete(markerDocRef);
    });

    await batch.commit();
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

  const deleteSchedulesBatch = (scheduleIds: string[]) => {
    if (!firestore || scheduleIds.length === 0) return;
    const batch = writeBatch(firestore);
    scheduleIds.forEach(id => {
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', id);
        batch.delete(scheduleDocRef);
    });
    batch.commit();
  };
  
  const pasteSchedules = (day: number, time: string, clipboard: ClipboardItem[]) => {
    if (!firestore || clipboard.length === 0) return;
    const batch = writeBatch(firestore);
    const timestamp = Date.now();
    clipboard.forEach((item, index) => {
        const newId = `sch-${timestamp}-${index}`;
        const newScheduleItem: ScheduleItem = {
            id: newId,
            day,
            time,
            event: item.event,
            location: item.location,
            staffId: item.staffId || null,
        };
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
        batch.set(scheduleDocRef, newScheduleItem);
    });
    batch.commit();
  };
  
  const updateMapImage = (day: number, time: string, newUrl: string) => {
    if (!firestore) return;
    const mapId = `day${day}-${time.replace(':', '')}`;
    const mapDocRef = doc(firestore, 'venues', VENUE_ID, 'maps', mapId);
    setDocumentNonBlocking(mapDocRef, { day, time, mapImageUrl: newUrl }, { merge: true });
  }

  const updateMarkerPosition = (markerId: string, x: number, y: number) => {
    if (!firestore) return;
    const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', markerId);
    updateDocumentNonBlocking(markerDocRef, { x, y });
  };
  
  const addMarker = (staffId: string, day: number, time: string) => {
    if (!firestore) return;
    const markerId = `marker-${staffId}-${day}-${time.replace(':', '')}`;
    const newMarker: Omit<MapMarker, 'id'> = {
        staffId,
        day,
        time,
        x: Math.round(Math.random() * 80) + 10,
        y: Math.round(Math.random() * 80) + 10,
    };
    const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', markerId);
    setDocumentNonBlocking(markerDocRef, newMarker, { merge: true });
  };
  

  // Memoized data for rendering
  const memoizedData: VenueData = useMemo(() => {
    return {
      staff: staff ? [...staff].sort((a,b) => a.id.localeCompare(b.id)) : [],
      schedule: schedule ? [...schedule].sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)) : [],
      markers: markers || [],
      maps: maps || [],
    };
  }, [staff, schedule, markers, maps]);

  return { 
    data: memoizedData, 
    addStaff, 
    addStaffBatch, 
    updateStaff, 
    deleteStaff, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule, 
    deleteSchedulesBatch, 
    pasteSchedules, 
    updateMapImage, 
    initializeFirestoreData, 
    isLoading: !venueDoc || !staff || !schedule || !markers || !maps, 
    updateMarkerPosition,
    addMarker,
  };
};
    