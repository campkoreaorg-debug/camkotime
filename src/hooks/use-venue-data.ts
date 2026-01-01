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
} from 'firebase/firestore';
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate } from '@/lib/types';
import { initialData } from '@/lib/data';
import { useCallback, useMemo, useState, useEffect } from 'react';

const VENUE_ID = 'main-venue';
const EMPTY_ARRAY: any[] = [];

export const useVenueData = () => {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Firebase Refs
  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', VENUE_ID) : null), [firestore]);
  const staffColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'staff') : null), [firestore]);
  const rolesColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'roles') : null), [firestore]);
  const scheduleColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'schedules') : null), [firestore]);
  const markersColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'markers') : null), [firestore]);
  const mapsColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'maps') : null), [firestore]);

  // 2. Data Fetching
  const { data: venueDoc } = useDoc<any>(venueRef);
  const { data: rawStaff } = useCollection<StaffMember>(staffColRef);
  const { data: rawRoles } = useCollection<Role>(rolesColRef);
  const { data: rawSchedule } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: rawMarkers } = useCollection<MapMarker>(markersColRef);
  const { data: rawMaps } = useCollection<MapInfo>(mapsColRef);

  // 🔴 [최적화 핵심] 낙관적 업데이트를 위한 가벼운 상태 (전체 데이터 복사 X)
  // 서버 응답이 오기 전까지만 화면에 보여줄 임시 직책 정보입니다.
  const [optimisticRoles, setOptimisticRoles] = useState<Record<string, any>>({});

  // 서버 데이터(rawStaff)가 갱신되면(반영 완료), 임시 상태를 초기화하여 서버 데이터와 동기화합니다.
  useEffect(() => {
    setOptimisticRoles({});
  }, [rawStaff]);

  // 3. Data Processing (useMemo로 렉 제거)
  const sortedRoles = useMemo(() => {
    return (rawRoles || EMPTY_ARRAY).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [rawRoles]);

  const rolesMap = useMemo(() => {
    const map = new Map();
    (rawRoles || []).forEach((r: any) => map.set(r.id, r));
    return map;
  }, [rawRoles]);

  // 스태프 목록 계산 (서버 데이터 + 낙관적 데이터 병합)
  const staffWithDetails = useMemo(() => {
    const list = (rawStaff || EMPTY_ARRAY).map((s: any) => {
      // 1. (우선순위 높음) 방금 사용자가 변경한 임시 직책이 있으면 그걸 보여줌 (즉각 반응)
      if (s.id in optimisticRoles) {
         return { ...s, role: optimisticRoles[s.id] };
      }

      // 2. (우선순위 낮음) 서버에 저장된 직책 보여줌
      if (s.role && s.role.id) {
        const assignedRole = rolesMap.get(s.role.id);
        return {
          ...s,
          role: assignedRole ? { ...assignedRole, ...s.role } : s.role,
        };
      }
      return { ...s, role: null };
    });
    return list.sort((a: any, b: any) => a.id.localeCompare(b.id));
  }, [rawStaff, rolesMap, optimisticRoles]); // optimisticRoles가 변하면 즉시 재계산

  const sortedSchedule = useMemo(() => {
    return (rawSchedule || EMPTY_ARRAY).sort((a: any, b: any) =>
      `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)
    );
  }, [rawSchedule]);

  const markers = rawMarkers || EMPTY_ARRAY;
  const maps = rawMaps || EMPTY_ARRAY;
  const notification = venueDoc?.notification || '';

  // 4. Mutation Functions

  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    const batch = writeBatch(firestore);
    // ... (기존 초기화 로직 동일)
    const venueDocRef = doc(firestore, 'venues', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid, notification: '' });
    
    // Data setup logic...
    initialData.staff.forEach((staffMember) => {
        const { ...rest } = staffMember;
        batch.set(doc(firestore, 'venues', VENUE_ID, 'staff', rest.id), rest);
    });
    initialData.roles.forEach((role) => batch.set(doc(firestore, 'venues', VENUE_ID, 'roles', role.id), role));
    initialData.schedule.forEach((item) => batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', item.id), item));
    initialData.markers.forEach((marker) => batch.set(doc(firestore, 'venues', VENUE_ID, 'markers', marker.id), marker));
    initialData.maps.forEach((map) => batch.set(doc(firestore, 'venues', VENUE_ID, 'maps', map.id), map));

    await batch.commit();
  }, [firestore, user]);

  // ... (addStaff, deleteStaff 등 다른 함수들은 기존 최적화 버전 유지) ...
  const addStaff = (name: string, avatar: string) => {
    if (!firestore) return;
    const staffId = `staff-${Date.now()}`;
    const newStaff = { id: staffId, name, avatar, role: null };
    setDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), newStaff, {});
  };

  const addStaffBatch = (newStaffMembers: { name: string; avatar: string }[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const timestamp = Date.now();
    newStaffMembers.forEach((member, index) => {
      const staffId = `staff-${timestamp}-${index}`;
      batch.set(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), {
        id: staffId,
        name: member.name,
        avatar: member.avatar,
        role: null,
      });
    });
    batch.commit();
  };

  const deleteStaff = (staffId: string) => {
    if (!firestore || !scheduleColRef || !markersColRef) return;
    const processBackendDeletion = async () => {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'venues', VENUE_ID, 'staff', staffId));

      const [scheduleSnapshot, markerSnapshot] = await Promise.all([
        getDocs(query(scheduleColRef, where('staffIds', 'array-contains', staffId))),
        getDocs(query(markersColRef, where('staffIds', 'array-contains', staffId)))
      ]);

      scheduleSnapshot.forEach(d => {
        const newIds = (d.data().staffIds || []).filter((id: string) => id !== staffId);
        newIds.length > 0 ? batch.update(d.ref, { staffIds: newIds }) : batch.delete(d.ref);
      });

      markerSnapshot.forEach(d => {
        const newIds = (d.data().staffIds || []).filter((id: string) => id !== staffId);
        newIds.length > 0 ? batch.update(d.ref, { staffIds: newIds }) : batch.delete(d.ref);
      });

      await batch.commit();
    };
    processBackendDeletion();
  };

  const addSchedule = (values: Omit<ScheduleItem, 'id'>) => {
      if (!firestore) return;
      const newId = `sch-${Date.now()}`;
      setDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'schedules', newId), { id: newId, ...values, staffIds: values.staffIds || [] }, {});
  };

  const updateSchedule = (scheduleId: string, data: Partial<ScheduleItem>) => {
      if (!firestore) return;
      updateDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId), { ...data, staffIds: data.staffIds || [] });
  };

  const deleteSchedule = (scheduleId: string) => {
      if (!firestore) return;
      deleteDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId));
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
    const timestamp = Date.now();
    clipboard.forEach((item, index) => {
        const newId = `sch-${timestamp}-${index}`;
        batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', newId), {
            id: newId, day, time, event: item.event, location: item.location, staffIds: item.staffIds || []
        });
    });
    batch.commit();
  };

  const addRole = (name: string, day: number, time: string, scheduleTemplates: ScheduleTemplate[]) => {
      if (!firestore) return;
      const newId = `role-${Date.now()}`;
      setDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'roles', newId), { id: newId, name, day, time, scheduleTemplates }, {});
  };

  const deleteRole = (roleId: string) => {
    if (!firestore || !staffColRef) return;
    const processBackendDeletion = async () => {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'venues', VENUE_ID, 'roles', roleId));
      const staffSnapshot = await getDocs(query(staffColRef, where('role.id', '==', roleId)));
      staffSnapshot.forEach(d => batch.update(d.ref, { role: null }));
      await batch.commit();
    }
    processBackendDeletion();
  };

  // 🟢 [수정됨] 직책 배정 함수: 낙관적 업데이트(즉시 반응) 추가
  const assignRoleToStaff = (staffId: string, roleId: string) => {
    const roleToAssign = rolesMap.get(roleId);
    if (!roleToAssign || !firestore) return;

    const { day, time } = roleToAssign;

    // 1. [Optimistic Update] 화면에 먼저 반영 (서버 응답 대기 X)
    setOptimisticRoles(prev => ({
        ...prev,
        [staffId]: { id: roleId, name: roleToAssign.name, day, time }
    }));

    // 2. [Backend Update] 서버에 실제 저장
    const processBackendUpdate = async () => {
      if (!scheduleColRef) return;
      const batch = writeBatch(firestore);

      const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
      batch.update(staffDocRef, { role: { id: roleId, name: roleToAssign.name, day, time } });

      const oldSchedulesSnapshot = await getDocs(query(scheduleColRef, where('staffIds', 'array-contains', staffId), where('day', '==', day), where('time', '==', time)));
      
      oldSchedulesSnapshot.forEach(d => {
        const currentIds = d.data().staffIds || [];
        currentIds.length === 1 ? batch.delete(d.ref) : batch.update(d.ref, { staffIds: currentIds.filter((id: string) => id !== staffId) });
      });

      (roleToAssign.scheduleTemplates || []).forEach((template: ScheduleTemplate) => {
        const newId = `sch-tpl-${staffId}-${template.day}-${template.time.replace(':', '')}-${Math.random().toString(36).substr(2, 5)}`;
        batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', newId), {
          day: template.day, time: template.time, event: template.event, location: template.location, staffIds: [staffId]
        });
      });

      await batch.commit();
    };

    processBackendUpdate();
  };

  // 🟢 [수정됨] 직책 해제 함수: 낙관적 업데이트 추가
  const unassignRoleFromStaff = (staffId: string, roleDay: number, roleTime: string) => {
    if (!firestore || !scheduleColRef) return;

    // 1. [Optimistic Update] 화면에서 즉시 제거
    setOptimisticRoles(prev => ({
        ...prev,
        [staffId]: null 
    }));

    const processBackendUpdate = async () => {
      updateDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), { role: null });

      const batch = writeBatch(firestore);
      const snapshot = await getDocs(query(scheduleColRef, where('staffIds', 'array-contains', staffId), where('day', '==', roleDay), where('time', '==', roleTime)));
      snapshot.forEach(d => {
        const currentIds = d.data().staffIds || [];
        currentIds.length === 1 ? batch.delete(d.ref) : batch.update(d.ref, { staffIds: currentIds.filter((id: string) => id !== staffId) });
      });
      await batch.commit();
    }
    processBackendUpdate();
  };

  // ... (나머지 지도/마커 관련 함수 기존 유지)
  const updateMapImage = (day: number, time: string, newUrl: string) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'maps', `day${day}-${time.replace(':', '')}`), { day, time, mapImageUrl: newUrl }, { merge: true });
  };

  const updateMarkerPosition = (markerId: string, x: number, y: number, staffIds?: string[], day?: number, time?: string) => {
    if (!firestore) return;
    if (markerId.startsWith('default-marker-') && staffIds && day !== undefined && time) {
      setDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'markers', `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`), { staffIds, day, time, x, y }, { merge: true });
    } else {
      updateDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'markers', markerId), { x, y });
    }
  };

  const addMarker = (staffId: string, day: number, time: string) => {
    if (!firestore) return;
    setDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'markers', `marker-${staffId}-${day}-${time.replace(':', '')}`), {
      staffIds: [staffId], day, time, x: Math.round(Math.random() * 80) + 10, y: Math.round(Math.random() * 80) + 10
    }, { merge: true });
  };

  const deleteMarker = (markerId: string) => {
      if(firestore) deleteDocumentNonBlocking(doc(firestore, 'venues', VENUE_ID, 'markers', markerId));
  }

  const updateNotification = (text: string) => {
      if(venueRef) updateDocumentNonBlocking(venueRef, { notification: text });
  }

  return {
    data: { 
        staff: staffWithDetails, 
        roles: sortedRoles, 
        schedule: sortedSchedule, 
        markers, 
        maps, 
        notification 
    },
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
    deleteRole,
    assignRoleToStaff,
    unassignRoleFromStaff,
    isLoading: !rawStaff,
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