
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

  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', VENUE_ID) : null), [firestore]);
  const staffColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'staff') : null), [firestore]);
  const rolesColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'roles') : null), [firestore]);
  const scheduleColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'schedules') : null), [firestore]);
  const markersColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'markers') : null), [firestore]);
  const mapsColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'maps') : null), [firestore]);
  const scheduleTemplatesColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'scheduleTemplates') : null), [firestore]);

  const { data: venueDoc, isLoading: venueLoading } = useDoc<any>(venueRef);
  const { data: staff, isLoading: staffLoading } = useCollection<StaffMember>(staffColRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesColRef);
  const { data: schedule, isLoading: scheduleLoading } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers, isLoading: markersLoading } = useCollection<MapMarker>(markersColRef);
  const { data: maps, isLoading: mapsLoading } = useCollection<MapInfo>(mapsColRef);
  const { data: scheduleTemplates, isLoading: templatesLoading } = useCollection<ScheduleTemplate>(scheduleTemplatesColRef);

  useEffect(() => {
    const isDataLoading = venueLoading || staffLoading || rolesLoading || scheduleLoading || markersLoading || mapsLoading || templatesLoading;
    setIsLoading(isDataLoading);

    if (!isDataLoading) {
      setLocalData({
        staff: (staff || []).sort((a,b) => a.id.localeCompare(b.id)),
        roles: (roles || []).sort((a, b) => a.name.localeCompare(b.name)),
        schedule: (schedule || []).sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)),
        markers: markers || [],
        maps: maps || [],
        notification: venueDoc?.notification || '',
        scheduleTemplates: scheduleTemplates || [],
      });
    }
  }, [
    venueDoc, staff, roles, schedule, markers, maps, scheduleTemplates,
    venueLoading, staffLoading, rolesLoading, scheduleLoading, markersLoading, mapsLoading, templatesLoading
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
    initialData.scheduleTemplates.forEach((template) => batch.set(doc(firestore, 'venues', VENUE_ID, 'scheduleTemplates', template.id), template));
    
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

  const uploadRoles = (roles: Role[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    roles.forEach(role => {
        const roleId = `role-csv-${role.name.replace(/\s+/g, '')}-${Date.now()}`;
        batch.set(doc(firestore, 'venues', VENUE_ID, 'roles', roleId), {
            id: roleId,
            name: role.name,
            tasks: role.tasks || []
        });
    });
    batch.commit();
  }

  const deleteRole = (roleId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'venues', VENUE_ID, 'roles', roleId));
  };

 const assignTasksToStaff = async (
  staffId: string,
  tasks: ScheduleTemplate[], 
  day: number,
  time: string
) => {
  if (!firestore) return;

  // 1. 필수 값 검증
  if (!staffId) {
      console.error("⛔ [배정 실패] Staff ID가 누락되었습니다. 누구에게 배정할지 모릅니다.");
      return; 
  }

  if (day === undefined || !time) {
      console.error("⛔ [배정 실패] 날짜(Day) 또는 시간(Time)이 누락되었습니다.");
      return;
  }

  // 2. 들어오는 데이터 확인 (개발자 도구 콘솔 확인용)
  console.log(`🚀 배정 시작: Staff[${staffId}]에게 ${tasks.length}개의 업무를 Day[${day}] Time[${time}]에 배정합니다.`);

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
              staffIds: [staffId]
          };

          const docRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newScheduleId);
          batch.set(docRef, scheduleItem);
      });
      
      await batch.commit();
      console.log("✅ DB 업로드 성공!");
      
  } catch (error) {
      console.error("🔥 DB 업로드 중 에러 발생:", error);
  }
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

  const addScheduleTemplate = (template: Omit<ScheduleTemplate, 'id'>) => {
    if (!firestore) return;
    const newId = `template-${Date.now()}`;
    setDoc(doc(firestore, 'venues', VENUE_ID, 'scheduleTemplates', newId), { id: newId, ...template });
  }

  const deleteScheduleTemplate = (templateId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, 'venues', VENUE_ID, 'scheduleTemplates', templateId));
  }

  const updateMapImage = (day: number, time: string, newUrl: string) => {
    if (!firestore) return;
    setDoc(doc(firestore, 'venues', VENUE_ID, 'maps', `day${day}-${time.replace(':', '')}`), { day, time, mapImageUrl: newUrl }, { merge: true });
  };

  const updateMarkerPosition = (markerId: string, x: number, y: number, staffIds?: string[], day?: number, time?: string) => {
    if (!firestore) return;
    if (markerId.startsWith('default-marker-') && staffIds && day !== undefined && time) {
      setDoc(doc(firestore, 'venues', VENUE_ID, 'markers', `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`), { staffIds: [staffIds[0]], day, time, x, y }, { merge: true });
    } else {
      updateDoc(doc(firestore, 'venues', VENUE_ID, 'markers', markerId), { x, y });
    }
  };

  const addMarker = (staffId: string, day: number, time: string) => {
    if (!firestore) return;
    const markerId = `marker-${staffId}-${day}-${time.replace(':', '')}`;
    const existingMarker = localData?.markers.find(m => m.id === markerId);

    if (existingMarker) {
        // 이미 해당 시간대에 마커가 있으면 staffIds에 추가
        updateDoc(doc(firestore, 'venues', VENUE_ID, 'markers', markerId), {
            staffIds: arrayUnion(staffId)
        });
    } else {
        // 없으면 새로 생성
        setDoc(doc(firestore, 'venues', VENUE_ID, 'markers', markerId), {
            id: markerId,
            staffIds: [staffId],
            day,
            time,
            x: Math.round(Math.random() * 80) + 10,
            y: Math.round(Math.random() * 80) + 10
        });
    }
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
    uploadRoles,
    deleteRole,
    assignTasksToStaff,
    addTasksToRole,
    removeTaskFromRole,
    addScheduleTemplate,
    deleteScheduleTemplate,
    isLoading,
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

    
