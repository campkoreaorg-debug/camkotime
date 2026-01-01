
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
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate, Category } from '@/lib/types';
import { initialData } from '@/lib/data';
import { useCallback, useMemo, useState, useEffect } from 'react';

const VENUE_ID = 'main-venue';

const EMPTY_ARRAY: any[] = [];

export const useVenueData = () => {
  const firestore = useFirestore();
  const { user } = useUser();
  const [localData, setLocalData] = useState<VenueData | null>(null);

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
  
  const categoriesColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'venues', VENUE_ID, 'categories') : null),
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
  const { data: categories } = useCollection<Category>(categoriesColRef);
  const { data: schedule } = useCollection<ScheduleItem>(scheduleColRef);
  const { data: markers } = useCollection<MapMarker>(markersColRef);
  const { data: maps } = useCollection<MapInfo>(mapsColRef);

  useEffect(() => {
    const safeStaff = staff || EMPTY_ARRAY;
    const safeRoles = roles || EMPTY_ARRAY;
    const safeCategories = categories || EMPTY_ARRAY;
    const safeSchedule = schedule || EMPTY_ARRAY;
    const safeMarkers = markers || EMPTY_ARRAY;
    const safeMaps = maps || EMPTY_ARRAY;
    
    const safeNotification = venueDoc?.notification || '';

    const staffWithDetails: StaffMember[] = safeStaff.map((s: any) => {
      if (s.role && s.role.id) {
          const assignedRole = safeRoles.find((r: any) => r.id === s.role.id);
          return { 
              ...s, 
              role: assignedRole ? { ...assignedRole, ...s.role } : s.role,
          };
      }
      return { ...s, role: null };
    });
    
    setLocalData({
      staff: staffWithDetails.sort((a: any,b: any) => a.id.localeCompare(b.id)),
      roles: safeRoles.sort((a: any, b: any) => a.name.localeCompare(b.name)),
      categories: safeCategories.sort((a: any,b: any) => a.name.localeCompare(b.name)),
      schedule: safeSchedule.sort((a: any,b: any) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)),
      markers: safeMarkers,
      maps: safeMaps,
      notification: safeNotification,
    });
  // NOTE: stringify is used to ensure deep comparison of the objects in the dependency array
  }, [JSON.stringify(staff), JSON.stringify(roles), JSON.stringify(categories), JSON.stringify(schedule), JSON.stringify(markers), JSON.stringify(maps), venueDoc]);


  const initializeFirestoreData = useCallback(async () => {
    if (!firestore || !user) return;
    
    const batch = writeBatch(firestore);

    const venueDocRef = doc(firestore, 'venues', VENUE_ID);
    batch.set(venueDocRef, { name: 'My Main Venue', ownerId: user.uid, notification: '' });
    
    initialData.staff.forEach((staffMember) => {
        const { ...rest } = staffMember;
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', rest.id);
        batch.set(staffDocRef, rest);
    });
    
    initialData.roles.forEach((role) => {
      const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', role.id);
      batch.set(roleDocRef, role);
    });

    initialData.categories.forEach((category) => {
        const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', category.id);
        batch.set(categoryDocRef, category);
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
    const newStaff: Omit<StaffMember, 'position'> = { id: staffId, name, avatar, role: null };
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    setDocumentNonBlocking(staffDocRef, newStaff, {});
  };
  
  const addStaffBatch = (newStaffMembers: { name: string; avatar: string }[]) => {
    if (!firestore) return;

    setLocalData(prev => {
        if (!prev) return null;
        const timestamp = Date.now();
        const newStaff: StaffMember[] = newStaffMembers.map((member, index) => ({
            id: `staff-${timestamp}-${index}`,
            name: member.name,
            avatar: member.avatar,
            role: null,
        }));
        return {
            ...prev,
            staff: [...prev.staff, ...newStaff],
        }
    });

    const batch = writeBatch(firestore);
    const timestamp = Date.now();

    newStaffMembers.forEach((member, index) => {
        const staffId = `staff-${timestamp}-${index}`;
        const newStaff: Omit<StaffMember, 'position'> = {
            id: staffId,
            name: member.name,
            avatar: member.avatar,
            role: null,
        };
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
        batch.set(staffDocRef, newStaff);
    });

    batch.commit();
  };

  const deleteStaff = (staffId: string) => {
    if (!firestore || !scheduleColRef || !markersColRef) return;

    setLocalData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            staff: prev.staff.filter(s => s.id !== staffId),
            schedule: prev.schedule.map(s => ({
                ...s,
                staffIds: s.staffIds?.filter(id => id !== staffId)
            })).filter(s => s.staffIds && s.staffIds.length > 0),
            markers: prev.markers.map(m => ({
                ...m,
                staffIds: m.staffIds?.filter(id => id !== staffId)
            })).filter(m => m.staffIds && m.staffIds.length > 0),
        }
    });
    
    const batch = writeBatch(firestore);
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.delete(staffDocRef);

    const processQueries = async () => {
        const scheduleQuery = query(scheduleColRef, where('staffIds', 'array-contains', staffId));
        const scheduleSnapshot = await getDocs(scheduleQuery);
        scheduleSnapshot.forEach(doc => {
          const currentStaffIds = doc.data().staffIds || [];
          const newStaffIds = currentStaffIds.filter((id: string) => id !== staffId);
          if (newStaffIds.length > 0) {
            batch.update(doc.ref, { staffIds: newStaffIds });
          } else {
            batch.delete(doc.ref);
          }
        });

        const markerQuery = query(markersColRef, where('staffIds', 'array-contains', staffId));
        const markerSnapshot = await getDocs(markerQuery);
        markerSnapshot.forEach(doc => {
          const currentStaffIds = doc.data().staffIds || [];
          const newStaffIds = currentStaffIds.filter((id: string) => id !== staffId);
          if (newStaffIds.length > 0) {
            batch.update(doc.ref, { staffIds: newStaffIds });
          } else {
            batch.delete(doc.ref);
          }
        });
        
        await batch.commit();
    }
    processQueries();
  };

  const addSchedule = (values: Omit<ScheduleItem, 'id'>) => {
    if (!firestore) return;
    const newId = `sch-${Date.now()}`;
    const newScheduleItem: ScheduleItem = { 
        id: newId, 
        ...values,
        staffIds: values.staffIds || [] 
    };
    const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
    setDocumentNonBlocking(scheduleDocRef, newScheduleItem, {});
  };

  const updateSchedule = (scheduleId: string, data: Partial<ScheduleItem>) => {
    if (!firestore) return;
    const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
    const updateData = { ...data, staffIds: data.staffIds || [] };
    updateDocumentNonBlocking(scheduleDocRef, updateData);
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
  
  const pasteSchedules = (day: number, time: string, clipboard: any[]) => {
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
            staffIds: item.staffIds || [],
        };
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
        batch.set(scheduleDocRef, newScheduleItem);
    });
    batch.commit();
  };

  const addRole = (name: string, categoryId: string, day: number, time: string, scheduleTemplates: ScheduleTemplate[]) => {
    if (!firestore) return;
    const newId = `role-${Date.now()}`;
    const newRole: Role = { id: newId, name, categoryId, day, time, scheduleTemplates };
    const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', newId);
    setDocumentNonBlocking(roleDocRef, newRole, {});
  };

  const deleteRole = (roleId: string) => {
    if (!firestore || !staffColRef || !scheduleColRef) return;

    setLocalData(prev => {
        if (!prev) return null;
        const staffIdsWithRole = prev.staff.filter(s => s.role?.id === roleId).map(s => s.id);
        return {
            ...prev,
            roles: prev.roles.filter(r => r.id !== roleId),
            staff: prev.staff.map(s => s.role?.id === roleId ? { ...s, role: null } : s),
            schedule: prev.schedule.filter(s => !(s.staffIds && staffIdsWithRole.some(id => s.staffIds.includes(id)))),
        }
    });

    const batch = writeBatch(firestore);
    const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', roleId);
    batch.delete(roleDocRef);

    const processDeletion = async () => {
        const staffQuery = query(staffColRef, where('role.id', '==', roleId));
        const staffSnapshot = await getDocs(staffQuery);

        const staffIdsWithRole: string[] = [];
        staffSnapshot.forEach(staffDoc => {
            staffIdsWithRole.push(staffDoc.id);
            batch.update(staffDoc.ref, { role: null });
        });
        
        if (staffIdsWithRole.length > 0 && scheduleColRef) {
            for (const staffId of staffIdsWithRole) {
                const scheduleQuery = query(scheduleColRef, where('staffIds', 'array-contains', staffId));
                const scheduleSnapshot = await getDocs(scheduleQuery);
                scheduleSnapshot.forEach(scheduleDoc => {
                    const currentStaffIds = scheduleDoc.data().staffIds || [];
                    const newStaffIds = currentStaffIds.filter((id: string) => id !== staffId);
                    if(newStaffIds.length > 0) {
                        batch.update(scheduleDoc.ref, { staffIds: newStaffIds });
                    } else {
                        batch.delete(scheduleDoc.ref);
                    }
                });
            }
        }
        await batch.commit();
    }
    processDeletion();
  };

  const assignRoleToStaff = (staffId: string, roleId: string) => {
    if (!localData || !firestore || !scheduleColRef || !staffColRef) return;

    const roleToAssign = localData.roles.find(r => r.id === roleId);
    if (!roleToAssign) return;

    const { day, time } = roleToAssign;

    setLocalData(prev => {
        if (!prev) return null;

        const newStaffList = prev.staff.map(s => 
            s.id === staffId ? { ...s, role: { id: roleId, name: roleToAssign.name, day, time } } : s
        );
        
        const remainingSchedules = prev.schedule.filter(s => !(s.staffIds?.includes(staffId) && s.day === day && s.time === time));
        
        const newSchedules: ScheduleItem[] = (roleToAssign.scheduleTemplates || []).map(template => ({
            id: `sch-${staffId}-${template.day}-${template.time.replace(':', '')}-${Math.random().toString(36).substr(2, 5)}`,
            day: template.day,
            time: template.time,
            event: template.event,
            location: template.location,
            staffIds: [staffId],
        }));

        return {
            ...prev,
            staff: newStaffList,
            schedule: [...remainingSchedules, ...newSchedules],
        };
    });

    const processBackendUpdate = async () => {
        const batch = writeBatch(firestore);
        
        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
        batch.update(staffDocRef, { role: { id: roleId, name: roleToAssign.name, day, time } });
        
        const scheduleQuery = query(scheduleColRef, where('staffIds', 'array-contains', staffId), where('day', '==', day), where('time', '==', time));
        const oldSchedulesSnapshot = await getDocs(scheduleQuery);
        oldSchedulesSnapshot.forEach(d => batch.delete(d.ref));
        
        (roleToAssign.scheduleTemplates || []).forEach(template => {
            const newScheduleId = `sch-tpl-${staffId}-${template.day}-${template.time.replace(':','')}-${Math.random().toString(36).substr(2, 5)}`;
            const newScheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newScheduleId);
            batch.set(newScheduleDocRef, {
                day: template.day,
                time: template.time,
                event: template.event,
                location: template.location,
                staffIds: [staffId],
            });
        });
        
        await batch.commit();
    };

    processBackendUpdate();
  };
  
  const unassignRoleFromStaff = (staffId: string, roleDay: number, roleTime: string) => {
    if (!firestore || !scheduleColRef) return;

    setLocalData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            staff: prev.staff.map(s => s.id === staffId ? { ...s, role: null } : s),
            schedule: prev.schedule.filter(s => !(s.staffIds?.includes(staffId) && s.day === roleDay && s.time === roleTime)),
        };
    });
    
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    updateDocumentNonBlocking(staffDocRef, { role: null });

    const processScheduleDeletion = async () => {
        const batch = writeBatch(firestore);
        const q = query(scheduleColRef, where('staffIds', 'array-contains', staffId), where('day', '==', roleDay), where('time', '==', roleTime));
        const snapshot = await getDocs(q);
        snapshot.forEach(d => {
            const currentStaffIds = d.data().staffIds || [];
            const newStaffIds = currentStaffIds.filter((id: string) => id !== staffId);
            if(newStaffIds.length > 0) {
                batch.update(d.ref, { staffIds: newStaffIds });
            } else {
                batch.delete(d.ref);
            }
        });
        await batch.commit();
    }
    processScheduleDeletion();
  };

  const addCategory = (name: string) => {
    if (!firestore) return;
    const newId = `cat-${Date.now()}`;
    const newCategory: Category = { id: newId, name };
    const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', newId);
    setDocumentNonBlocking(categoryDocRef, newCategory, {});
  };

  const updateCategory = (id: string, name: string) => {
    if (!firestore || !rolesColRef) return;
    const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', id);
    updateDocumentNonBlocking(categoryDocRef, { name });
  };
  
  const deleteCategory = (id: string) => {
    if (!firestore || !rolesColRef) return;

    setLocalData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            categories: prev.categories.filter(c => c.id !== id),
            roles: prev.roles.map(r => r.categoryId === id ? { ...r, categoryId: '' } : r),
        }
    });

    const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', id);
    deleteDocumentNonBlocking(categoryDocRef);

    const processRoleUpdates = async () => {
        const batch = writeBatch(firestore);
        const q = query(rolesColRef, where('categoryId', '==', id));
        const rolesSnapshot = await getDocs(q);
        rolesSnapshot.forEach(d => {
          batch.update(d.ref, { categoryId: '' });
        });
        await batch.commit();
    }
    processRoleUpdates();
  };

  const updateMapImage = (day: number, time: string, newUrl: string) => {
    if (!firestore) return;
    const mapId = `day${day}-${time.replace(':', '')}`;
    const mapDocRef = doc(firestore, 'venues', VENUE_ID, 'maps', mapId);
    setDocumentNonBlocking(mapDocRef, { day, time, mapImageUrl: newUrl }, { merge: true });
  };

  const updateMarkerPosition = (markerId: string, x: number, y: number, staffIds?: string[], day?: number, time?: string) => {
    if (!firestore) return;
    
    if (markerId.startsWith('default-marker-') && staffIds && day !== undefined && time) {
        const newMarkerId = `marker-${staffIds[0]}-${day}-${time.replace(':', '')}`;
        const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', newMarkerId);
        const newMarkerData: Omit<MapMarker, 'id'> = {
            staffIds,
            day,
            time,
            x,
            y,
        };
        setDocumentNonBlocking(markerDocRef, newMarkerData, { merge: true });
    } else {
        const markerDocRef = doc(firestore, 'venues', VENUE_ID, 'markers', markerId);
        updateDocumentNonBlocking(markerDocRef, { x, y });
    }
  };
  
  const addMarker = (staffId: string, day: number, time: string) => {
    if (!firestore) return;
    const markerId = `marker-${staffId}-${day}-${time.replace(':', '')}`;
    const newMarker: Omit<MapMarker, 'id'> = {
        staffIds: [staffId],
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


  return { 
    data: localData || { staff: [], roles: [], categories: [], schedule: [], markers: [], maps: [], notification: '' }, 
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
    addCategory,
    updateCategory,
    deleteCategory,
    isLoading: !localData, 
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

    

    