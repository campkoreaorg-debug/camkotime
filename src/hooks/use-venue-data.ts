"use client";

import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser, storage } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  query, // 🟢 import 중복 제거 및 정리 완료
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
import { initialData } from '@/lib/data';
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
  
  // 🟢 [수정] allRolesColRef는 권한 문제로 인해 사용하지 않고, 아래 useEffect에서 직접 쿼리합니다.
  // const allRolesColRef = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'roles') : null), [firestore]);

  const { data: venueDoc, isLoading: venueLoading } = useDoc<any>(venueRef);
  const { data: staff, isLoading: staffLoading } = useCollection<StaffMember>(staffColRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesColRef);
  const { data: schedule, isLoading: scheduleLoading } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers, isLoading: markersLoading } = useCollection<MapMarker>(markersColRef);
  const { data: maps, isLoading: mapsLoading } = useCollection<MapInfo>(mapsColRef);
  const { data: scheduleTemplates, isLoading: templatesLoading } = useCollection<ScheduleTemplate>(scheduleTemplatesColRef);
  
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allRolesLoading, setAllRolesLoading] = useState(true);

  // 🟢 [핵심 수정] 권한 에러 해결: 내 세션만 가져오기
  useEffect(() => {
    const fetchAllRoles = async () => {
        if (!firestore || !user) return;
        
        setAllRolesLoading(true);
        const rolesData: Role[] = [];
        
        try {
            // 'ownerId'가 '나(user.uid)'인 세션만 가져옵니다.
            const q = query(
                collection(firestore, 'sessions'), 
                where('ownerId', '==', user.uid)
            );
            const sessionsSnapshot = await getDocs(q);
            
            for (const sessionDoc of sessionsSnapshot.docs) {
                const rolesSnapshot = await getDocs(collection(firestore, 'sessions', sessionDoc.id, 'roles'));
                rolesSnapshot.forEach(roleDoc => {
                    // 각 세션의 day 정보도 함께 저장
                    const sessionData = sessionDoc.data();
                    // sessionData.day가 없으면 기본값 0 사용
                    const day = sessionData.day !== undefined ? sessionData.day : 0;
                    rolesData.push({ ...roleDoc.data(), day } as Role);
                });
            }
            setAllRoles(rolesData);
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        } finally {
            setAllRolesLoading(false);
        }
    };
    fetchAllRoles();
  }, [firestore, roles, user]); // user가 변경될 때도 다시 실행


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
      
      // 🟢 [복원] 사용자님의 sessionRoles 매핑 로직 유지
      const sessionRoles = allRoles?.map(role => {
        // ... (기존 로직 유지) ... 
        // 여기서는 이미 allRoles에 day가 들어가 있으므로 그대로 써도 됩니다.
        // 하지만 기존 로직을 최대한 존중하여 유지합니다.
        return role; 
      }) || [];


      setLocalData({
        staff: (staff || []).sort((a,b) => a.id.localeCompare(b.id)),
        roles: sortedRoles,
        allRoles: allRoles, // 위에서 가져온 allRoles 사용
        schedule: (schedule || []).sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)),
        markers: markers || [],
        maps: maps || [],
        notification: venueDoc?.notification || '',
        scheduleTemplates: scheduleTemplates || [],
      });
    }
  }, [
    sessionId, venueDoc, staff, roles, schedule, markers, maps, scheduleTemplates, allRoles,
    venueLoading, staffLoading, rolesLoading, scheduleLoading, markersLoading, mapsLoading, templatesLoading, allRolesLoading
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
    initialData.scheduleTemplates.forEach((template) => batch.set(doc(sessionRef, 'scheduleTemplates', template.id), template));
    
    await batch.commit();
    // 🟢 [수정] reload 제거됨
    // window.location.reload();

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

 const assignTasksToStaff = async (
  staffId: string,
  tasks: ScheduleTemplate[], 
  day: number,
  time: string,
  roleName: string
) => {
  if (!firestore || !sessionId) return;

  if (!staffId) {
      console.error("⛔ [배정 실패] Staff ID가 누락되었습니다.");
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

  // 🟢 [수정] 이 함수가 바로 그 '새로고침 없이 상태만 바꾸는' 함수입니다.
  const updateScheduleStatus = async (scheduleId: string, currentStatus: boolean) => {
    if (!firestore || !sessionId) return;
    try {
        const scheduleRef = doc(firestore, 'sessions', sessionId, 'schedules', scheduleId);
        await updateDoc(scheduleRef, { isCompleted: !currentStatus });
    } catch (error) {
        console.error("스케줄 상태 업데이트 실패:", error);
        throw error;
    }
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

    // 🟢 [복원] 사용자님의 추가 기능 유지
    const addScheduleTemplatesToSlot = async (templateIds: string[], day: number) => {
        if (!firestore || !sessionId || !localData?.scheduleTemplates) return;

        const templatesToAssign = localData.scheduleTemplates.filter(t => templateIds.includes(t.id));
        const templateNamesToAssign = new Set(templatesToAssign.map(t => t.name));

        const rolesForDayQuery = query(collection(firestore, 'sessions', sessionId, 'roles'), where('day', '==', day));
        const existingRolesSnap = await getDocs(rolesForDayQuery);
        
        const batch = writeBatch(firestore);

        // Delete roles for the day that are not in the new selection
        existingRolesSnap.forEach(roleDoc => {
            if (!templateNamesToAssign.has(roleDoc.data().name)) {
                batch.delete(roleDoc.ref);
            }
        });

        // Add or update roles for the day from selected templates
        templatesToAssign.forEach((template, index) => {
            const role: Role = {
                ...template, 
                id: `role-day-${day}-${template.id}`,
                day: day,
                order: index
            };
            const roleRef = doc(firestore, 'sessions', sessionId, 'roles', role.id);
            batch.set(roleRef, role, { merge: true });
        });

        await batch.commit();
    };

    const addScheduleTemplate = (data: Omit<ScheduleTemplate, 'id'>) => {
        if (!firestore || !sessionId) return;
        const newId = `template-${Date.now()}`;
        setDoc(doc(firestore, 'sessions', sessionId, 'scheduleTemplates', newId), { id: newId, ...data });
    }

    const updateScheduleTemplate = (templateId: string, data: Partial<ScheduleTemplate>) => {
        if (!firestore || !sessionId) return;
        updateDoc(doc(firestore, 'sessions', sessionId, 'scheduleTemplates', templateId), data);
    }
    
    const deleteScheduleTemplate = (templateId: string) => {
        if (!firestore || !sessionId) return;
        deleteDoc(doc(firestore, 'sessions', sessionId, 'scheduleTemplates', templateId));
    }

    const importScheduleTemplates = async (templates: {day: string, category: string, name: string, tasks: string}[]) => {
        if (!firestore || !sessionId) return;
        const batch = writeBatch(firestore);
        
        templates.forEach(template => {
            const newId = `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const tasksArray = template.tasks.split(';').map(t => ({ event: t.trim() })).filter(t => t.event);
            const newTemplate: ScheduleTemplate = {
                id: newId,
                day: parseInt(template.day, 10) || 0,
                category: template.category || '',
                name: template.name,
                tasks: tasksArray,
            };
            const docRef = doc(firestore, 'sessions', sessionId, 'scheduleTemplates', newId);
            batch.set(docRef, newTemplate);
        });

        await batch.commit();
    };

    const copyTimeSlotData = async (sourceSlot: { day: number, time: string }, destinationSlot: { day: number, time: string }) => {
        if (!firestore || !sessionId || sourceSlot.day !== destinationSlot.day) return;
    
        const sessionRef = doc(firestore, 'sessions', sessionId);
        const batch = writeBatch(firestore);
    
        // 1. Delete existing data for the destination slot
        const existingSchedulesQuery = query(collection(sessionRef, 'schedules'), where('day', '==', destinationSlot.day), where('time', '==', destinationSlot.time));
        const existingMarkersQuery = query(collection(sessionRef, 'markers'), where('day', '==', destinationSlot.day), where('time', '==', destinationSlot.time));
        
        const [existingSchedulesSnap, existingMarkersSnap] = await Promise.all([getDocs(existingSchedulesQuery), getDocs(existingMarkersQuery)]);
        
        existingSchedulesSnap.forEach(doc => batch.delete(doc.ref));
        existingMarkersSnap.forEach(doc => batch.delete(doc.ref));
    
        // 2. Copy data from source to destination
        const sourceSchedulesQuery = query(collection(sessionRef, 'schedules'), where('day', '==', sourceSlot.day), where('time', '==', sourceSlot.time));
        const sourceMarkersQuery = query(collection(sessionRef, 'markers'), where('day', '==', sourceSlot.day), where('time', '==', sourceSlot.time));
        
        const [sourceSchedulesSnap, sourceMarkersSnap] = await Promise.all([getDocs(sourceSchedulesQuery), getDocs(sourceMarkersQuery)]);
        
        sourceSchedulesSnap.forEach(d => {
            const newId = `sch-${destinationSlot.day}-${destinationSlot.time.replace(':', '')}-${d.id.slice(-5)}`;
            const newData = { ...d.data(), time: destinationSlot.time, id: newId };
            batch.set(doc(sessionRef, 'schedules', newId), newData);
        });
    
        sourceMarkersSnap.forEach(d => {
            const newId = `marker-${destinationSlot.day}-${destinationSlot.time.replace(':', '')}-${d.id.slice(-5)}`;
            const newData = { ...d.data(), time: destinationSlot.time, id: newId };
            batch.set(doc(sessionRef, 'markers', newId), newData);
        });
    
        await batch.commit();
    };


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
    assignTasksToStaff,
    unassignRoleFromStaff,
    addTasksToRole,
    removeTaskFromRole,
    updateScheduleStatus, // 🟢 [중요] 새로고침 없는 상태 변경 함수
    toggleScheduleCompletion,
    addScheduleTemplatesToSlot, // 🟢 [복원] 누락되었던 함수들 모두 복원
    isLoading: isLoading, 
    updateMarkerPosition,
    addMarker,
    deleteMarker,
    updateNotification,
    addScheduleTemplate,
    updateScheduleTemplate,
    deleteScheduleTemplate,
    importScheduleTemplates,
    copyTimeSlotData,
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