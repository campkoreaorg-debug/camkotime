
"use client";

import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  getDocs,
  deleteDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate } from '@/lib/types';
import { initialData } from '@/lib/data';
import { useCallback, useState, useEffect } from 'react';

const VENUE_ID = 'main-venue';

export const useVenueData = () => {
  const firestore = useFirestore();
  const { user } = useUser();

  const [localData, setLocalData] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number, time: string} | null>(null);

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', VENUE_ID) : null), [firestore]);
  const staffColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'staff') : null), [firestore]);
  const rolesColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'roles') : null), [firestore]);
  const scheduleColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'schedules') : null), [firestore]);
  const markersColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'markers') : null), [firestore]);
  const mapsColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'maps') : null), [firestore]);

  const { data: venueDoc, isLoading: venueLoading } = useDoc<any>(venueRef);
  const { data: staff, isLoading: staffLoading } = useCollection<StaffMember>(staffColRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesColRef);
  const { data: schedule, isLoading: scheduleLoading } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers, isLoading: markersLoading } = useCollection<MapMarker>(markersColRef);
  const { data: maps, isLoading: mapsLoading } = useCollection<MapInfo>(mapsColRef);

  useEffect(() => {
    const isDataLoading = venueLoading || staffLoading || rolesLoading || scheduleLoading || markersLoading || mapsLoading;
    setIsLoading(isDataLoading);

    if (!isDataLoading) {
      setLocalData({
        staff: (staff || []).sort((a,b) => a.id.localeCompare(b.id)),
        roles: (roles || []).sort((a, b) => a.name.localeCompare(b.name)),
        schedule: (schedule || []).sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)),
        markers: markers || [],
        maps: maps || [],
        notification: venueDoc?.notification || '',
        scheduleTemplates: [], // This is now part of Role
      });
    }
  }, [
    venueDoc, staff, roles, schedule, markers, maps,
    venueLoading, staffLoading, rolesLoading, scheduleLoading, markersLoading, mapsLoading
  ]);


  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    const batch = writeBatch(firestore);
    
    batch.set(doc(firestore, 'venues', VENUE_ID), { name: 'My Main Venue', ownerId: user.uid, notification: '' });
    
    initialData.staff.forEach((s) => batch.set(doc(firestore, 'venues', VENUE_ID, 'staff', s.id), s));
    initialData.roles.forEach((r) => batch.set(doc(firestore, 'venues', VENUE_ID, 'roles', r.id), r));
    initialData.schedule.forEach((item) => batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', item.id), item));
    initialData.markers.forEach((m) => batch.set(doc(firestore, 'venues', VENUE_ID, 'markers', m.id), m));
    initialData.maps.forEach((map) => batch.set(doc(firestore, 'venues', VENUE_ID, 'maps', map.id), map));
    
    await batch.commit();
  }, [firestore, user]);

  const addStaffBatch = (newStaffMembers: { name: string; avatar: string }[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    newStaffMembers.forEach(member => {
      const staffId = `staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), {
        id: staffId, name: member.name, avatar: member.avatar
      });
    });
    batch.commit();
  };

  const deleteStaff = (staffId: string) => {
    if (!firestore) return;
    const processBackendDeletion = async () => {
        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'venues', VENUE_ID, 'staff', staffId));

        const scheduleQuery = query(collection(firestore, 'venues', VENUE_ID, 'schedules'), where('staffIds', 'array-contains', staffId));
        const markerQuery = query(collection(firestore, 'venues', VENUE_ID, 'markers'), where('staffIds', 'array-contains', staffId));

        const [scheduleSnapshot, markerSnapshot] = await Promise.all([getDocs(scheduleQuery), getDocs(markerQuery)]);

        scheduleSnapshot.forEach(d => {
            const newIds = d.data().staffIds.filter((id: string) => id !== staffId);
            newIds.length > 0 ? batch.update(d.ref, { staffIds: newIds }) : batch.delete(d.ref);
        });
        markerSnapshot.forEach(d => {
            const newIds = d.data().staffIds?.filter((id: string) => id !== staffId);
            newIds && newIds.length > 0 ? batch.update(d.ref, { staffIds: newIds }) : batch.delete(d.ref);
        });

        await batch.commit();
    };
    processBackendDeletion();
  };

  const addSchedule = (values: Omit<ScheduleItem, 'id'>) => {
      if (!firestore) return;
      const newId = `sch-${Date.now()}`;
      setDoc(doc(firestore, 'venues', VENUE_ID, 'schedules', newId), { id: newId, ...values, staffIds: values.staffIds || [] });
  };

  const updateSchedule = (scheduleId: string, data: Partial<ScheduleItem>) => {
      if (!firestore) return;
      updateDoc(doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId), { ...data, staffIds: data.staffIds || [] });
  };

  const deleteSchedule = (scheduleId: string) => {
      if (!firestore) return;
      deleteDoc(doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId));
  };
  
  const deleteSchedulesBatch = (ids: string[]) => {
      if(!firestore || ids.length === 0) return;
      const batch = writeBatch(firestore);
      ids.forEach(id => batch.delete(doc(firestore, 'venues', VENUE_ID, 'schedules', id)));
      batch.commit();
  };

  const deleteAllSchedules = async () => {
    if (!firestore || !scheduleColRef) return;
    const batch = writeBatch(firestore);
    const snapshot = await getDocs(scheduleColRef);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  };

  const pasteSchedules = (day: number, time: string, clipboard: any[]) => {
    if (!firestore || clipboard.length === 0) return;
    const batch = writeBatch(firestore);
    clipboard.forEach(item => {
        const newId = `sch-paste-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', newId), {
            id: newId, day, time, event: item.event, location: item.location, staffIds: item.staffIds || []
        });
    });
    batch.commit();
  };

  const addRole = (name: string, tasks: ScheduleTemplate[]) => {
      if (!firestore) return;
      const newId = `role-${Date.now()}`;
      const newRole: Role = { id: newId, name, tasks: tasks || [] };
      setDoc(doc(firestore, 'venues', VENUE_ID, 'roles', newId), newRole);
  };

  const deleteRole = (roleId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'venues', VENUE_ID, 'roles', roleId));
  };

  const assignTasksToStaff = (staffId: string, tasks: ScheduleTemplate[]) => {
    if (!firestore || !selectedSlot) return;

    const { day, time } = selectedSlot;
    const batch = writeBatch(firestore);
    tasks.forEach(task => {
        const newScheduleId = `sch-${staffId}-${day}-${time}-${Math.random().toString(36).substr(2, 5)}`;
        const scheduleItem: ScheduleItem = {
            id: newScheduleId,
            day,
            time,
            event: task.event,
            location: task.location || '',
            staffIds: [staffId]
        };
        batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', newScheduleId), scheduleItem);
    });
    batch.commit();
  }
  
  const addTasksToRole = (roleId: string, tasks: ScheduleTemplate[]) => {
    if(!firestore) return;
    updateDoc(doc(firestore, 'venues', VENUE_ID, 'roles', roleId), {
        tasks: arrayUnion(...tasks)
    });
  }

  const removeTaskFromRole = (roleId: string, task: ScheduleTemplate) => {
    if(!firestore) return;
    updateDoc(doc(firestore, 'venues', VENUE_ID, 'roles', roleId), {
        tasks: arrayRemove(task)
    });
  }

  const updateMapImage = (day: number, time: string, newUrl: string) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'venues', VENUE_ID, 'maps', `day${day}-${time.replace(':', '')}`), { day, time, mapImageUrl: newUrl }, { merge: true });
  };

  const updateMarkerPosition = (markerId: string, x: number, y: number, staffIds?: string[], day?: number, time?: string) => {
    if (!firestore) return;
    if (markerId.startsWith('default-marker-') && staffIds && day !== undefined && time) {
      setDoc(doc(firestore, 'venues', VENUE_ID, 'markers', `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`), { staffIds, day, time, x, y }, { merge: true });
    } else {
      updateDoc(doc(firestore, 'venues', VENUE_ID, 'markers', markerId), { x, y });
    }
  };

  const addMarker = (staffId: string, day: number, time: string) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'venues', VENUE_ID, 'markers', `marker-${staffId}-${day}-${time.replace(':', '')}`), {
      staffIds: [staffId], day, time, x: Math.round(Math.random() * 80) + 10, y: Math.round(Math.random() * 80) + 10
    }, { merge: true });
  };

  const deleteMarker = (markerId: string) => {
      if(firestore) deleteDoc(doc(firestore, 'venues', VENUE_ID, 'markers', markerId));
  }

  const updateNotification = (text: string) => {
      if(venueRef) updateDoc(venueRef, { notification: text });
  }

  return {
    data: localData,
    addStaffBatch,
    deleteStaff,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    deleteSchedulesBatch,
    deleteAllSchedules,
    pasteSchedules,
    updateMapImage,
    initializeFirestoreData,
    addRole,
    deleteRole,
    assignTasksToStaff,
    addTasksToRole,
    removeTaskFromRole,
    isLoading,
    updateMarkerPosition,
    addMarker,
    deleteMarker,
    updateNotification,
    setSelectedSlot
  };
};

export const timeSlots = (() => {
  const slots = [];
  for (let h = 7; h < 24; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('00:00');
  return slots;
})();

    