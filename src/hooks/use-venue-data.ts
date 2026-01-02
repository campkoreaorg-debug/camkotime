
"use client";

import {useCollection,useDoc,useFirestore,useMemoFirebase,useUser,storage 
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
  getDoc,
  collectionGroup,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate, Session } from '@/lib/types';
import { initialData, initialSessions } from '@/lib/data';
import { useCallback, useState, useEffect } from 'react';
import { useSession } from './use-session';

const VENUE_ID = 'main-venue';

export const useVenueData = (overrideSessionId?: string | null) => {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const sessionContext = useSession(); 
  const contextSessionId = sessionContext?.sessionId;

  // Prioritize URL param, then context, then null
  const sessionId = overrideSessionId || contextSessionId;

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
  const allRolesColRef = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'roles') : null), [firestore]);

  const { data: venueDoc, isLoading: venueLoading } = useDoc<any>(venueRef);
  const { data: staff, isLoading: staffLoading } = useCollection<StaffMember>(staffColRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesColRef);
  const { data: schedule, isLoading: scheduleLoading } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers, isLoading: markersLoading } = useCollection<MapMarker>(markersColRef);
  const { data: maps, isLoading: mapsLoading } = useCollection<MapInfo>(mapsColRef);
  const { data: scheduleTemplates, isLoading: templatesLoading } = useCollection<ScheduleTemplate>(scheduleTemplatesColRef);
  
  const { data: allRoles, isLoading: allRolesLoading } = useCollection<Role>(allRolesColRef);


  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setLocalData(null);
      return;
    }

    const isDataLoading = venueLoading || staffLoading || rolesLoading || scheduleLoading || markersLoading || mapsLoading || templatesLoading || allRolesLoading;
    setIsLoading(isDataLoading);

    if (!isDataLoading) {
      
      const sortedRoles = [...(roles || [])].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return (b.tasks?.length || 0) - (a.tasks?.length || 0);
      });
      
      const sessionRoles = allRoles?.map(role => {
        // @ts-ignore
        if (role.ref && role.ref.parent && role.ref.parent.parent) {
            // @ts-ignore
            const roleSessionId = role.ref.parent.parent.id;
            const matchingSession = sessionContext.sessions.find(s => s.id === roleSessionId);
            if (matchingSession) {
                // Assuming session name is like "1차", "2차"
                const dayNumber = parseInt(matchingSession.name, 10) - 1;
                return { ...role, day: isNaN(dayNumber) ? 0 : dayNumber };
            }
        }
        return { ...role, day: 0 };
      }) || [];


      setLocalData({
        staff: (staff || []).sort((a,b) => a.id.localeCompare(b.id)),
        roles: sortedRoles,
        allRoles: sessionRoles,
        schedule: (schedule || []).sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)),
        markers: markers || [],
        maps: maps || [],
        notification: venueDoc?.notification || '',
        scheduleTemplates: scheduleTemplates || [],
      });
    }
  }, [
    sessionId, venueDoc, staff, roles, schedule, markers, maps, scheduleTemplates, allRoles,
    venueLoading, staffLoading, rolesLoading, scheduleLoading, markersLoading, mapsLoading, templatesLoading, allRolesLoading, sessionContext.sessions
  ]);

  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user ) return;
    
    let currentSessionId = sessionId;
    if (!currentSessionId) {
        const newSessionRef = doc(collection(firestore, 'sessions'));
        await setDoc(newSessionRef, { name: '1차', ownerId: user.uid, id: newSessionRef.id });
        currentSessionId = newSessionRef.id;
    }
    
    const batch = writeBatch(firestore);
    
    const sessionRef = doc(firestore, 'sessions', currentSessionId);
    
    const venueDocRef = doc(sessionRef, 'venue', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid, notification: '', isPublic: false });
    
    initialData.staff.forEach((s) => batch.set(doc(sessionRef, 'staff', s.id), s));
    initialData.roles.forEach((r, index) => batch.set(doc(sessionRef, 'roles', r.id), { ...r, day: 0, order: index }));
    initialData.schedule.forEach((item) => batch.set(doc(sessionRef, 'schedules', item.id), item));
    initialData.markers.forEach((m) => batch.set(doc(sessionRef, 'markers', m.id), m));
    initialData.maps.forEach((map) => batch.set(doc(sessionRef, 'maps', map.id), map));
    
    await batch.commit();
    window.location.reload();

  }, [firestore, user, sessionId]);

  const addStaffBatch = async (newStaffMembers: { name: string; file: File }[]) => {
    if (!firestore || !sessionId || !storage) {
        console.error("Firebase resources missing:", { firestore: !!firestore, sessionId, storage: !!storage });
        return;
    }

    try {
        const uploadPromises = newStaffMembers.map(async (member) => {
            const staffId = `staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const fileRef = ref(storage, `sessions/${sessionId}/staff_avatars/${staffId}_${member.file.name}`);
            
            const snapshot = await uploadBytes(fileRef, member.file);
            const avatarUrl = await getDownloadURL(snapshot.ref);

            return {
                id: staffId,
                name: member.name,
                avatar: avatarUrl,
            };
        });

        const uploadedStaffData = await Promise.all(uploadPromises);

        const batch = writeBatch(firestore);
        uploadedStaffData.forEach((staffData) => {
            const staffDocRef = doc(firestore, 'sessions', sessionId, 'staff', staffData.id);
            batch.set(staffDocRef, staffData);
        });

        await batch.commit();
        
    } catch (error) {
        console.error("Error in addStaffBatch:", error);
        throw error;
    }
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
      setDoc(doc(firestore, 'sessions', sessionId, 'schedules', newId), { id: newId, ...values, staffIds: values.staffIds || [], isCompleted: false });
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
            id: newId, day, time, event: item.event, location: item.location, staffIds: item.staffIds || [], isCompleted: false
        });
    });
    batch.commit();
  };

  const addRole = (name: string, tasks: ScheduleTemplate[], day: number) => {
      if (!firestore || !sessionId || !localData || localData.schedule === null) return;
      const newId = `role-${Date.now()}`;
      const newRole: Role = { id: newId, name, tasks: tasks || [], day, order: (localData.roles?.length || 0) };
      setDoc(doc(firestore, 'sessions', sessionId, 'roles', newId), newRole);
  };

  const uploadRoles = (roles: Role[], day: number) => {
    if (!firestore || !sessionId) return;
    const batch = writeBatch(firestore);
    roles.forEach(role => {
        const sanitizedName = role.name.replace(/[\/\s#$.\[\]]/g, '');
        const roleId = `role-csv-${sanitizedName}-${Date.now()}`;
        batch.set(doc(firestore, 'sessions', sessionId, 'roles', roleId), {
            id: roleId,
            name: role.name,
            tasks: role.tasks || [],
            day
        });
    });
    batch.commit();
  }

  const deleteRole = (roleId: string) => {
    if (!firestore || !sessionId) return;
    deleteDoc(doc(firestore, 'sessions', sessionId, 'roles', roleId));
  };
  
  const updateRoleOrder = (roleIds: string[]) => {
    if (!firestore || !sessionId) return;
    const batch = writeBatch(firestore);
    roleIds.forEach((id, index) => {
        const docRef = doc(firestore, 'sessions', sessionId, 'roles', id);
        batch.update(docRef, { order: index });
    });
    batch.commit();
  };

  const importRolesFromOtherDays = (roleIds: string[], targetDay: number) => {
    if (!firestore || !sessionId || !localData?.allRoles) return;
    const rolesToImport = localData.allRoles.filter(r => roleIds.includes(r.id));
    const batch = writeBatch(firestore);
    rolesToImport.forEach(role => {
        const newId = `role-import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        batch.set(doc(firestore, 'sessions', sessionId, 'roles', newId), {
            ...role,
            id: newId,
            day: targetDay,
            order: (localData.roles?.length || 0) + 1,
        });
    });
    batch.commit();
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
              isCompleted: false
          };

          const docRef = doc(firestore, 'sessions', sessionId, 'schedules', newScheduleId);
          batch.set(docRef, scheduleItem);
      });
      
      await batch.commit();
      
  } catch (error) {
      console.error("🔥 DB 업로드 중 에러 발생:", error);
  }
}

  const unassignRoleFromStaff = async (staffId: string, roleName: string, day: number, time: string) => {
    if (!firestore || !sessionId) return;
    const q = query(
      collection(firestore, 'sessions', sessionId, 'schedules'),
      where('day', '==', day),
      where('time', '==', time),
      where('roleName', '==', roleName),
      where('staffIds', 'array-contains', staffId)
    );
    const scheduleSnapshot = await getDocs(q);
    const batch = writeBatch(firestore);
    scheduleSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  
  const addTasksToRole = (roleId: string, tasks: ScheduleTemplate[]) => {
    if(!firestore || !sessionId) return;
    updateDoc(doc(firestore, 'sessions', sessionId, 'roles', roleId), {
        tasks: arrayUnion(...tasks.map(t => ({...t})))
    });
  }

  const removeTaskFromRole = (roleId: string, task: ScheduleTemplate) => {
    if(!firestore || !sessionId) return;
    updateDoc(doc(firestore, 'sessions', sessionId, 'roles', roleId), {
        tasks: arrayRemove(task)
    });
  };

  const updateScheduleStatus = (scheduleIds: string[], newStatus: boolean) => {
    if (!firestore || !sessionId || scheduleIds.length === 0) return;
    const batch = writeBatch(firestore);
    scheduleIds.forEach(id => {
      const scheduleRef = doc(firestore, 'sessions', sessionId, 'schedules', id);
      batch.update(scheduleRef, { isCompleted: newStatus });
    })
    batch.commit();
  };
  
  const toggleScheduleCompletion = async (scheduleId: string) => {
    if (!firestore || !sessionId) return;
    const scheduleRef = doc(firestore, 'sessions', sessionId, 'schedules', scheduleId);
    try {
        const scheduleSnap = await getDoc(scheduleRef);
        if (scheduleSnap.exists()) {
            const currentStatus = scheduleSnap.data().isCompleted || false;
            await updateDoc(scheduleRef, { isCompleted: !currentStatus });
        }
    } catch (error) {
        console.error("Error toggling schedule completion:", error);
    }
  };

  const updateMapImage = async (day: number, time: string, file: File): Promise<string | null> => {
    if (!firestore || !sessionId || !storage) return null;
    const mapId = `day${day}-${time.replace(':', '')}`;
    const filePath = `sessions/${sessionId}/map_backgrounds/${mapId}-${file.name}`;
    
    try {
        const fileRef = ref(storage, filePath);
        const snapshot = await uploadBytes(fileRef, file);
        const mapImageUrl = await getDownloadURL(snapshot.ref);

        if (mapImageUrl) {
            await setDoc(doc(firestore, 'sessions', sessionId, 'maps', mapId), { day, time, mapImageUrl }, { merge: true });
            return mapImageUrl;
        }
    } catch(e) {
        console.error("Failed to upload map image:", e)
    }

    return null;
  };

  const updateMarkerPosition = (markerId: string, x: number, y: number, staffIds?: string[], day?: number, time?: string) => {
    if (!firestore || !sessionId) return;
    const sessionRef = doc(firestore, 'sessions', sessionId);
    if (markerId.startsWith('default-marker-') && staffIds && day !== undefined && time) {
      setDoc(doc(sessionRef, 'markers', `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`), { id: `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`, staffIds: [staffIds[0]], day, time, x, y }, { merge: true });
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
    updateRoleOrder,
    importRolesFromOtherDays,
    assignTasksToStaff,
    unassignRoleFromStaff,
    addTasksToRole,
    removeTaskFromRole,
    updateScheduleStatus,
    toggleScheduleCompletion,
    isLoading: isLoading, 
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

    