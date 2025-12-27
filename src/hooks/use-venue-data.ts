
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
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, RoleKorean } from '@/lib/types';
import { initialData, roleSchedules } from '@/lib/data';
import { useCallback, useMemo } from 'react';
import { timeSlots } from '@/components/admin/SchedulePanel';

const VENUE_ID = 'main-venue'; 

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

  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    
    const batch = writeBatch(firestore);

    const venueDocRef = doc(firestore, 'venues', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid });
    
    initialData.staff.forEach((staffMember) => {
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffMember.id);
        batch.set(staffDocRef, staffMember);
    });

    initialData.schedule.forEach((scheduleItem) => {
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleItem.id);
        batch.set(scheduleDocRef, scheduleItem);
    });
    
    initialData.markers.forEach((marker) => {
        const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', marker.id);
        batch.set(markerDocRef, marker);
    });
    
    initialData.maps.forEach((map) => {
        const mapDocRef = doc(firestore, 'venues', VENUE_ID, 'maps', map.id);
        batch.set(mapDocRef, map);
    });

    await batch.commit();

  }, [firestore, user]);

  const addStaff = async (name: string, role: RoleKorean, avatar: string) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const staffId = `staff-${Date.now()}`;
    
    const newStaff: StaffMember = { id: staffId, name, role, avatar };
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.set(staffDocRef, newStaff);

    const roleScheduleTemplate = roleSchedules.find(rs => rs.role === role);
    if(roleScheduleTemplate) {
        timeSlots.forEach(time => {
            days.forEach(day => {
                const scheduleId = `sch-${staffId}-${day}-${time.replace(':', '')}`;
                const newSchedule: ScheduleItem = {
                    id: scheduleId,
                    day,
                    time,
                    event: roleScheduleTemplate.event,
                    location: roleScheduleTemplate.location,
                    staffId: staffId,
                };
                const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
                batch.set(scheduleDocRef, newSchedule);
            });
        });
    }

    await batch.commit();
  };

  const updateStaffRole = async (staffId: string, newRole: RoleKorean) => {
    if (!firestore || !staffColRef || !scheduleColRef) return;
    const batch = writeBatch(firestore);

    // 1. Update staff document
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.update(staffDocRef, { role: newRole });

    // 2. Delete old role-based schedules for this staff member
    const q = query(scheduleColRef, where('staffId', '==', staffId));
    const oldSchedulesSnapshot = await getDocs(q);
    oldSchedulesSnapshot.forEach(doc => batch.delete(doc.ref));

    // 3. Add new role-based schedules
    const roleScheduleTemplate = roleSchedules.find(rs => rs.role === newRole);
    if (roleScheduleTemplate) {
      days.forEach(day => {
        timeSlots.forEach(time => {
          const scheduleId = `sch-${staffId}-${day}-${time.replace(':', '')}`;
          const newSchedule: ScheduleItem = {
            id: scheduleId,
            day,
            time,
            event: roleScheduleTemplate.event,
            location: roleScheduleTemplate.location,
            staffId: staffId,
          };
          const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
          batch.set(scheduleDocRef, newSchedule);
        });
      });
    }

    await batch.commit();
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
            role: '운영', // Default role
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
    if (!firestore || !scheduleColRef || !markersColRef) return;
    
    const batch = writeBatch(firestore);

    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.delete(staffDocRef);

    const scheduleQuery = query(scheduleColRef, where('staffId', '==', staffId));
    const markerQuery = query(markersColRef, where('staffId', '==', staffId));

    const [scheduleSnapshot, markerSnapshot] = await Promise.all([
      getDocs(scheduleQuery),
      getDocs(markerQuery)
    ]);
    
    scheduleSnapshot.forEach(doc => batch.delete(doc.ref));
    markerSnapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
  };

  const addSchedule = (values: Omit<ScheduleItem, 'id'>) => {
    if (!firestore) return;

    if(values.role && !values.staffId) { // 역할 기반 스케줄
      const relevantStaff = staff?.filter(s => s.role === values.role) || [];
      const batch = writeBatch(firestore);
      relevantStaff.forEach(s => {
        const newId = `sch-${s.id}-${values.day}-${values.time.replace(':', '')}`;
        const newScheduleItem: ScheduleItem = { id: newId, ...values, staffId: s.id };
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
        batch.set(scheduleDocRef, newScheduleItem, { merge: true });
      });
      batch.commit();
    } else { // 개인 기반 스케줄
      const newId = `sch-${Date.now()}`;
      const newScheduleItem: ScheduleItem = { id: newId, ...values };
      const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
      setDocumentNonBlocking(scheduleDocRef, newScheduleItem, {});
    }
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
            role: item.role || null
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
  

  const memoizedData: VenueData = useMemo(() => {
    return {
      staff: staff ? [...staff].sort((a,b) => a.id.localeCompare(b.id)) : [],
      schedule: schedule ? [...schedule].sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)) : [],
      markers: markers || [],
      maps: maps || [],
    };
  }, [staff, schedule, markers, maps]);

  const days = [0,1,2,3];

  return { 
    data: memoizedData, 
    addStaff, 
    addStaffBatch, 
    updateStaff, 
    deleteStaff,
    updateStaffRole,
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
    