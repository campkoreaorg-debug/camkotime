
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

  // Firestore Refs
  const venueRef = useMemoFirebase(() => (firestore ? doc(firestore, 'venues', VENUE_ID) : null), [firestore]);
  const staffColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'staff') : null), [firestore]);
  const rolesColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'roles') : null), [firestore]);
  const scheduleColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'schedules') : null), [firestore]);
  const markersColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'markers') : null), [firestore]);
  const mapsColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'maps') : null), [firestore]);
  const templatesColRef = useMemoFirebase(() => (firestore ? collection(firestore, 'venues', VENUE_ID, 'scheduleTemplates') : null), [firestore]);

  // Firestore Data Hooks
  const { data: venueDoc, isLoading: venueLoading } = useDoc<any>(venueRef);
  const { data: staff, isLoading: staffLoading } = useCollection<StaffMember>(staffColRef);
  const { data: roles, isLoading: rolesLoading } = useCollection<Role>(rolesColRef);
  const { data: schedule, isLoading: scheduleLoading } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers, isLoading: markersLoading } = useCollection<MapMarker>(markersColRef);
  const { data: maps, isLoading: mapsLoading } = useCollection<MapInfo>(mapsColRef);
  const { data: scheduleTemplates, isLoading: templatesLoading } = useCollection<ScheduleTemplate>(templatesColRef);

  useEffect(() => {
    const isDataLoading = venueLoading || staffLoading || rolesLoading || scheduleLoading || markersLoading || mapsLoading || templatesLoading;
    setIsLoading(isDataLoading);

    if (!isDataLoading) {
      const staffWithRoles = (staff || []).map(s => {
        const assignedRole = (roles || []).find(r => s.role && s.role.id === r.id && s.role.day === r.day && s.role.time === r.time);
        return {
          ...s,
          role: assignedRole ? { ...assignedRole, ...s.role } : s.role,
        };
      });

      setLocalData({
        staff: staffWithRoles.sort((a,b) => a.id.localeCompare(b.id)),
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
    initialData.scheduleTemplates.forEach((tpl) => batch.set(doc(firestore, 'venues', VENUE_ID, 'scheduleTemplates', tpl.id), tpl));
    
    await batch.commit();
  }, [firestore, user]);

  const addStaffBatch = (newStaffMembers: { name: string; avatar: string }[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    newStaffMembers.forEach(member => {
      const staffId = `staff-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), {
        id: staffId, name: member.name, avatar: member.avatar, role: null
      });
    });
    batch.commit();
  };

  const deleteStaff = (staffId: string) => {
    if (!firestore || !localData) return;

    setLocalData(prev => prev ? ({
        ...prev,
        staff: prev.staff.filter(s => s.id !== staffId),
        schedule: prev.schedule.map(s => ({
            ...s,
            staffIds: s.staffIds.filter(id => id !== staffId)
        })).filter(s => s.staffIds.length > 0),
        markers: prev.markers.map(m => ({
            ...m,
            staffIds: m.staffIds?.filter(id => id !== staffId)
        })).filter(m => m.staffIds && m.staffIds.length > 0),
    }) : null);

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
            const newIds = d.data().staffIds.filter((id: string) => id !== staffId);
            newIds.length > 0 ? batch.update(d.ref, { staffIds: newIds }) : batch.delete(d.ref);
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

  const addRole = (name: string, day: number, time: string, scheduleTemplates: Omit<ScheduleTemplate, 'id'>[]) => {
      if (!firestore) return;
      const newId = `role-${Date.now()}`;
      const newRole: Role = { id: newId, name, day, time, scheduleTemplates };

      setLocalData(prev => prev ? ({ ...prev, roles: [...prev.roles, newRole] }) : null);
      
      setDoc(doc(firestore, 'venues', VENUE_ID, 'roles', newId), newRole);
  };

  const deleteRole = (roleId: string) => {
    if (!firestore || !localData) return;

    setLocalData(prev => prev ? ({
        ...prev,
        roles: prev.roles.filter(r => r.id !== roleId),
        staff: prev.staff.map(s => s.role?.id === roleId ? { ...s, role: null } : s),
    }) : null);

    const processBackendDeletion = async () => {
      const batch = writeBatch(firestore);
      batch.delete(doc(firestore, 'venues', VENUE_ID, 'roles', roleId));
      const staffQuery = query(collection(firestore, 'venues', VENUE_ID, 'staff'), where('role.id', '==', roleId));
      const staffSnapshot = await getDocs(staffQuery);
      staffSnapshot.forEach(d => batch.update(d.ref, { role: null }));
      await batch.commit();
    }
    processBackendDeletion();
  };

  const assignRoleToStaff = (staffId: string, roleId: string) => {
    if (!localData) return;

    const roleToAssign = localData.roles.find(r => r.id === roleId);
    if (!roleToAssign) return;

    setLocalData(prev => {
        if (!prev) return null;
        const newStaffList = prev.staff.map(s => {
            if (s.id === staffId) return { ...s, role: { id: roleId, name: roleToAssign.name, day: roleToAssign.day, time: roleToAssign.time } };
            if (s.role?.id === roleId) return { ...s, role: null };
            return s;
        });

        const oldSchedules = prev.schedule.filter(s => {
            const wasAssignedToThisStaff = s.staffIds.includes(staffId) && s.day === roleToAssign.day && s.time === roleToAssign.time;
            const wasAssignedToOldOwner = prev.staff.find(staff => staff.role?.id === roleId && staff.id !== staffId)?.id;
            const belongsToOldOwner = wasAssignedToOldOwner && s.staffIds.includes(wasAssignedToOldOwner) && s.day === roleToAssign.day && s.time === roleToAssign.time;
            return !wasAssignedToThisStaff && !belongsToOldOwner;
        });

        const newSchedules = (roleToAssign.scheduleTemplates || []).map(template => ({
            id: `sch-${staffId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            day: template.day,
            time: template.time,
            event: template.event,
            location: template.location || '',
            staffIds: [staffId]
        }));
        
        return { ...prev, staff: newStaffList, schedule: [...oldSchedules, ...newSchedules] };
    });

    const processBackendUpdate = async () => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        
        // Unassign from old staff
        const staffQuery = query(collection(firestore, 'venues', VENUE_ID, 'staff'), where('role.id', '==', roleId));
        const staffSnapshot = await getDocs(staffQuery);
        const oldOwnerIds: string[] = [];
        staffSnapshot.forEach(d => {
            if (d.id !== staffId) {
                oldOwnerIds.push(d.id);
                batch.update(d.ref, { role: null });
            }
        });

        // Assign to new staff
        batch.update(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), { role: { id: roleId, name: roleToAssign.name, day: roleToAssign.day, time: roleToAssign.time } });

        // Delete old schedules for the role
        const staffIdsToClear = [staffId, ...oldOwnerIds];
        const scheduleQuery = query(collection(firestore, 'venues', VENUE_ID, 'schedules'), where('staffIds', 'array-contains-any', staffIdsToClear), where('day', '==', roleToAssign.day), where('time', '==', roleToAssign.time));
        const oldSchedulesSnapshot = await getDocs(scheduleQuery);
        oldSchedulesSnapshot.forEach(d => batch.delete(d.ref));
        
        // Add new schedules from template
        (roleToAssign.scheduleTemplates || []).forEach(template => {
            const newId = `sch-tpl-${staffId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            batch.set(doc(firestore, 'venues', VENUE_ID, 'schedules', newId), { ...template, id: newId, staffIds: [staffId] });
        });

        await batch.commit();
    };
    processBackendUpdate();
  };

  const unassignRoleFromStaff = (staffId: string) => {
    if (!localData) return;
    const staffMember = localData.staff.find(s => s.id === staffId);
    if (!staffMember?.role) return;
    const { day, time } = staffMember.role;

    setLocalData(prev => prev ? ({
        ...prev,
        staff: prev.staff.map(s => s.id === staffId ? { ...s, role: null } : s),
        schedule: prev.schedule.filter(s => !(s.staffIds.includes(staffId) && s.day === day && s.time === time))
    }) : null);

    const processBackendUpdate = async () => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        batch.update(doc(firestore, 'venues', VENUE_ID, 'staff', staffId), { role: null });
        const scheduleQuery = query(collection(firestore, 'venues', VENUE_ID, 'schedules'), where('staffIds', 'array-contains', staffId), where('day', '==', day), where('time', '==', time));
        const snapshot = await getDocs(scheduleQuery);
        snapshot.forEach(d => batch.delete(d.ref));
        await batch.commit();
    };
    processBackendUpdate();
  };

  const addScheduleTemplate = (templates: Omit<ScheduleTemplate, 'id'>[]) => {
    if (!firestore || templates.length === 0) return;
    const batch = writeBatch(firestore);
    templates.forEach(t => {
      const newId = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(firestore, 'venues', VENUE_ID, 'scheduleTemplates', newId), { ...t, id: newId });
    });
    batch.commit();
  };

  const deleteScheduleTemplate = (templateId: string) => {
      if(firestore) deleteDoc(doc(firestore, 'venues', VENUE_ID, 'scheduleTemplates', templateId));
  };

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
    assignRoleToStaff,
    unassignRoleFromStaff,
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
