
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
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate, Session } from '@/lib/types';
import { initialData, initialSessions } from '@/lib/data';
import { useCallback, useState, useEffect } from 'react';
import { useSession } from './use-session';

const VENUE_ID = 'main-venue';

export const useVenueData = () => {
  const firestore = useFirestore();
  const { user } = useUser();
  const { sessionId } = useSession();

  const [localData, setLocalData] = useState<VenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session-dependent refs
  const venueRef = useMemoFirebase(() => (firestore && sessionId ? doc(firestore, 'sessions', sessionId, 'venue', VENUE_ID) : null), [firestore, sessionId]);
  const staffColRef = useMemoFirebase(() => (firestore && sessionId ? collection(firestore, 'sessions', sessionId, 'staff') : null), [firestore, sessionId]);
  const rolesColRef = useMemoFirebase(() => (firestore && sessionId ? collection(firestore, 'sessions', sessionId, 'roles') : null), [firestore, sessionId]);
  const scheduleColRef = useMemoFirebase(() => (firestore && sessionId ? collection(firestore, 'sessions', sessionId, 'schedules') : null), [firestore, sessionId]);
  const markersColRef = useMemoFirebase(() => (firestore && sessionId ? collection(firestore, 'sessions', sessionId, 'markers') : null), [firestore, sessionId]);
  const mapsColRef = useMemoFirebase(() => (firestore && sessionId ? collection(firestore, 'sessions', sessionId, 'maps') : null), [firestore, sessionId]);
  const scheduleTemplatesColRef = useMemoFirebase(() => (firestore && sessionId ? collection(firestore, 'sessions', sessionId, 'scheduleTemplates') : null), [firestore, sessionId]);

  const { data: venueDoc, isLoading: venueLoading } = useDoc<any>(venueRef);
  const { data: staff, isLoading: staffLoading } = useCollection<StaffMember>(staffColRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesColRef);
  const { data: schedule, isLoading: scheduleLoading } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers, isLoading: markersLoading } = useCollection<MapMarker>(markersColRef);
  const { data: maps, isLoading: mapsLoading } = useCollection<MapInfo>(mapsColRef);
  const { data: scheduleTemplates, isLoading: templatesLoading } = useCollection<ScheduleTemplate>(scheduleTemplatesColRef);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setLocalData(null);
      return;
    }

    const isDataLoading = venueLoading || staffLoading || rolesLoading || scheduleLoading || markersLoading || mapsLoading || templatesLoading;
    setIsLoading(isDataLoading);

    if (!isDataLoading) {
      const scheduleData = schedule ? [...schedule].sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)) : [];
      setLocalData({
        staff: (staff || []).sort((a,b) => a.id.localeCompare(b.id)),
        roles: (roles || []).sort((a, b) => a.name.localeCompare(b.name)),
        schedule: scheduleData,
        markers: markers || [],
        maps: maps || [],
        notification: venueDoc?.notification || '',
        scheduleTemplates: scheduleTemplates || [],
      });
    }
  }, [
    sessionId, venueDoc, staff, roles, schedule, markers, maps, scheduleTemplates,
    venueLoading, staffLoading, rolesLoading, scheduleLoading, markersLoading, mapsLoading, templatesLoading
  ]);

  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user ) return;
    const batch = writeBatch(firestore);

    // Create initial sessions
    initialSessions.forEach((session) => {
        const sessionRef = doc(firestore, 'sessions', session.id);
        batch.set(sessionRef, { name: session.name, ownerId: user.uid });

        // For each session, create the venue and initial data
        const venueDocRef = doc(sessionRef, 'venue', VENUE_ID);
        batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid, notification: '' });
        
        initialData.staff.forEach((s) => batch.set(doc(sessionRef, 'staff', s.id), s));
        initialData.roles.forEach((r) => batch.set(doc(sessionRef, 'roles', r.id), r));
        initialData.schedule.forEach((item) => batch.set(doc(sessionRef, 'schedules', item.id), item));
        initialData.markers.forEach((m) => batch.set(doc(sessionRef, 'markers', m.id), m));
        initialData.maps.forEach((map) => batch.set(doc(sessionRef, 'maps', map.id), map));
    });
    
    await batch.commit();
  }, [firestore, user]);

  const addStaffBatch = (newStaffMembers: { name: string; avatar: string }[]) => {
    if (!firestore || !sessionId) return;
    const batch = writeBatch(firestore);
    newStaffMembers.forEach(member => {
      const staffId = `staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(firestore, 'sessions', sessionId, 'staff', staffId), {
        id: staffId, name: member.name, avatar: member.avatar
      });
    });
    batch.commit();
  };

  const deleteStaff = (staffId: string) => {
    if (!firestore || !sessionId) return;
    const processBackendDeletion = async () => {
        const batch = writeBatch(firestore);
        const sessionRef = doc(firestore, 'sessions', sessionId);
        batch.delete(doc(sessionRef, 'staff', staffId));

        const scheduleQuery = query(collection(sessionRef, 'schedules'), where('staffIds', 'array-contains', staffId));
        const markerQuery = query(collection(sessionRef, 'markers'), where('staffIds', 'array-contains', staffId));

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
      if (!firestore || !sessionId) return;
      const newId = `sch-${Date.now()}`;
      setDoc(doc(firestore, 'sessions', sessionId, 'schedules', newId), { id: newId, ...values, staffIds: values.staffIds || [] });
  };

  const updateSchedule = (scheduleId: string, data: Partial<ScheduleItem>) => {
      if (!firestore || !sessionId) return;
      updateDoc(doc(firestore, 'sessions', sessionId, 'schedules', scheduleId), { ...data, staffIds: data.staffIds || [] });
  };

  const deleteSchedule = (scheduleId: string) => {
      if (!firestore || !sessionId) return;
      deleteDoc(doc(firestore, 'sessions', sessionId, 'schedules', scheduleId));
  };
  
  const deleteSchedulesBatch = (ids: string[]) => {
      if(!firestore || !sessionId || ids.length === 0) return;
      const batch = writeBatch(firestore);
      ids.forEach(id => batch.delete(doc(firestore, 'sessions', sessionId, 'schedules', id)));
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
    if (!firestore || !sessionId || clipboard.length === 0) return;
    const batch = writeBatch(firestore);
    clipboard.forEach(item => {
        const newId = `sch-paste-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        batch.set(doc(firestore, 'sessions', sessionId, 'schedules', newId), {
            id: newId, day, time, event: item.event, location: item.location, staffIds: item.staffIds || []
        });
    });
    batch.commit();
  };

  const addRole = (name: string, tasks: ScheduleTemplate[]) => {
      if (!firestore || !sessionId) return;
      const newId = `role-${Date.now()}`;
      const newRole: Role = { id: newId, name, tasks: tasks || [] };
      setDoc(doc(firestore, 'sessions', sessionId, 'roles', newId), newRole);
  };

  const uploadRoles = (roles: Role[]) => {
    if (!firestore || !sessionId) return;
    const batch = writeBatch(firestore);
    roles.forEach(role => {
        const roleId = `role-csv-${role.name.replace(/\s+/g, '')}-${Date.now()}`;
        batch.set(doc(firestore, 'sessions', sessionId, 'roles', roleId), {
            id: roleId,
            name: role.name,
            tasks: role.tasks || []
        });
    });
    batch.commit();
  }

  const deleteRole = (roleId: string) => {
    if (!firestore || !sessionId) return;
    deleteDoc(doc(firestore, 'sessions', sessionId, 'roles', roleId));
  };

 const assignTasksToStaff = async (
  staffId: string,
  tasks: ScheduleTemplate[], 
  day: number,
  time: string,
  roleName: string
) => {
  if (!firestore || !sessionId) return;

  if (!staffId) {
      console.error("⛔ [배정 실패] Staff ID가 누락되었습니다. 누구에게 배정할지 모릅니다.");
      return; 
  }

  if (day === undefined || !time) {
      console.error("⛔ [배정 실패] 날짜(Day) 또는 시간(Time)이 누락되었습니다.");
      return;
  }

  try {
      const batch = writeBatch(firestore);
      
      tasks.forEach(task => {
          const newScheduleId = `sch-${staffId}-${day}-${time.replace(':','')}-${Math.random().toString(36).substr(2, 5)}`;
          
          const scheduleItem: ScheduleItem = {
              id: newScheduleId,
              day,
              time,
              event: task.event,
              location: task.location || '',
              staffIds: [staffId],
              roleName: roleName,
          };

          const docRef = doc(firestore, 'sessions', sessionId, 'schedules', newScheduleId);
          batch.set(docRef, scheduleItem);
      });
      
      await batch.commit();
      
  } catch (error) {
      console.error("🔥 DB 업로드 중 에러 발생:", error);
  }
}
  
  const addTasksToRole = (roleId: string, tasks: ScheduleTemplate[]) => {
    if(!firestore || !sessionId) return;
    updateDoc(doc(firestore, 'sessions', sessionId, 'roles', roleId), {
        tasks: arrayUnion(...tasks)
    });
  }

  const removeTaskFromRole = (roleId: string, task: ScheduleTemplate) => {
    if(!firestore || !sessionId) return;
    updateDoc(doc(firestore, 'sessions', sessionId, 'roles', roleId), {
        tasks: arrayRemove(task)
    });
  }

  const updateMapImage = (day: number, time: string, newUrl: string) => {
    if (!firestore || !sessionId) return;
    setDoc(doc(firestore, 'sessions', sessionId, 'maps', `day${day}-${time.replace(':', '')}`), { day, time, mapImageUrl: newUrl }, { merge: true });
  };

  const updateMarkerPosition = (markerId: string, x: number, y: number, staffIds?: string[], day?: number, time?: string) => {
    if (!firestore || !sessionId) return;
    const sessionRef = doc(firestore, 'sessions', sessionId);
    if (markerId.startsWith('default-marker-') && staffIds && day !== undefined && time) {
      setDoc(doc(sessionRef, 'markers', `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`), { staffIds: [staffIds[0]], day, time, x, y }, { merge: true });
    } else {
      updateDoc(doc(sessionRef, 'markers', markerId), { x, y });
    }
  };

  const addMarker = (staffId: string, day: number, time: string, x: number, y: number) => {
    if (!firestore || !sessionId) return;
    const markerId = `marker-${staffId}-${day}-${time.replace(':', '')}`;
    const existingMarker = localData?.markers.find(m => m.id === markerId);

    if (existingMarker) {
        updateDoc(doc(firestore, 'sessions', sessionId, 'markers', markerId), {
            staffIds: arrayUnion(staffId)
        });
    } else {
        setDoc(doc(firestore, 'sessions', sessionId, 'markers', markerId), {
            id: markerId,
            staffIds: [staffId],
            day,
            time,
            x,
            y
        });
    }
  };

  const deleteMarker = (markerId: string) => {
      if(firestore && sessionId) deleteDoc(doc(firestore, 'sessions', sessionId, 'markers', markerId));
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
    uploadRoles,
    deleteRole,
    assignTasksToStaff,
    addTasksToRole,
    removeTaskFromRole,
    isLoading: isLoading || !sessionId,
    updateMarkerPosition,
    addMarker,
    deleteMarker,
    updateNotification,
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
