
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
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate } from '@/lib/types';
import { initialData } from '@/lib/data';
import { useCallback, useMemo } from 'react';

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
  
  const rolesColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'venues', VENUE_ID, 'roles') : null),
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
  const { data: roles } = useCollection<Role>(rolesColRef);
  const { data: schedule } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers } = useCollection<MapMarker>(markersColRef);
  const { data: maps } = useCollection<MapInfo>(mapsColRef);

  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    
    const batch = writeBatch(firestore);

    const venueDocRef = doc(firestore, 'venues', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid, notification: '' });
    
    initialData.staff.forEach((staffMember) => {
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffMember.id);
        batch.set(staffDocRef, staffMember);
    });
    
    initialData.roles.forEach((role) => {
      const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', role.id);
      batch.set(roleDocRef, role);
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

  const addStaff = (name: string, avatar: string) => {
    if (!firestore) return;
    const staffId = `staff-${Date.now()}`;
    const newStaff: StaffMember = { id: staffId, name, avatar, role: null };
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
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
            avatar: member.avatar,
            role: null,
        };

        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
        batch.set(staffDocRef, newStaff);
    });

    await batch.commit();
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

  const deleteAllSchedules = async () => {
    if (!firestore || !scheduleColRef) return;
    const batch = writeBatch(firestore);
    const snapshot = await getDocs(scheduleColRef);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
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
            staffId: item.staffId || "",
        };
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
        batch.set(scheduleDocRef, newScheduleItem);
    });
    batch.commit();
  };

  const addRole = (name: string, scheduleTemplates: ScheduleTemplate[]) => {
    if (!firestore) return;
    const newId = `role-${Date.now()}`;
    const newRole: Role = { id: newId, name, scheduleTemplates };
    const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', newId);
    setDocumentNonBlocking(roleDocRef, newRole, {});
  };

  const assignRoleToStaff = async (staffId: string, roleId: string) => {
    if (!firestore || !staffColRef || !scheduleColRef) return;
    
    const roleToAssign = roles?.find(r => r.id === roleId);
    const staffToAssign = staff?.find(s => s.id === staffId);
    if (!roleToAssign || !staffToAssign) return;

    const batch = writeBatch(firestore);

    // 1. Update staff document with role information
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.update(staffDocRef, { role: { id: roleToAssign.id, name: roleToAssign.name } });

    // 2. Delete old schedules for this staff member
    const q = query(scheduleColRef, where('staffId', '==', staffId));
    const oldSchedulesSnapshot = await getDocs(q);
    oldSchedulesSnapshot.forEach(doc => batch.delete(doc.ref));

    // 3. Add new schedules based on the role template
    if (roleToAssign.scheduleTemplates) {
      roleToAssign.scheduleTemplates?.forEach(template => {
          // [방어 코드] template.time이 유효한지 확인합니다.
          if (!template || typeof template.time !== 'string') {
            console.warn('Skipping invalid schedule template:', template);
            return; // 유효하지 않은 템플릿은 건너뜁니다.
          }
          const scheduleId = `sch-${staffId}-${template.day}-${template.time.replace(':', '')}-${Math.random().toString(36).substr(2, 5)}`;
          const newSchedule: ScheduleItem = {
            id: scheduleId,
            day: template.day,
            time: template.time,
            event: template.event,
            location: template.location,
            staffId: staffId,
          };
          const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
          batch.set(scheduleDocRef, newSchedule);
      })
    }
    
    await batch.commit();
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
  
  const deleteMarker = (markerId: string) => {
    if (!firestore) return;
    const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', markerId);
    deleteDocumentNonBlocking(markerDocRef);
  }

  const updateNotification = (text: string) => {
    if (!venueRef) return;
    updateDocumentNonBlocking(venueRef, { notification: text });
  }

  const memoizedData: VenueData = useMemo(() => {
    const staffWithRoles = staff?.map(s => {
      const assignedRole = roles?.find(r => r.id === s.role?.id);
      return { ...s, role: assignedRole || s.role || null };
    }) || [];
    
    return {
      staff: staffWithRoles ? [...staffWithRoles].sort((a,b) => a.id.localeCompare(b.id)) : [],
      roles: roles ? [...roles].sort((a, b) => a.name.localeCompare(b.name)) : [],
      schedule: schedule ? [...schedule].sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)) : [],
      markers: markers || [],
      maps: maps || [],
      notification: venueDoc?.notification || '',
    };
  }, [staff, roles, schedule, markers, maps, venueDoc]);

  return { 
    data: memoizedData, 
    addStaff,
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
    assignRoleToStaff,
    isLoading: !venueDoc || !staff || !roles || !schedule || !markers || !maps, 
    updateMarkerPosition,
    addMarker,
    deleteMarker,
    updateNotification,
  };
};

// This needs to be available to other components, so we export it.
export const timeSlots = (() => {
  const slots = [];
  for (let h = 7; h < 24; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('00:00');
  return slots;
})();

    

    


    



