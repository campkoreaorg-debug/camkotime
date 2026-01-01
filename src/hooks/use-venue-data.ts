

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
import type { VenueData, StaffMember, ScheduleItem, MapMarker, MapInfo, Role, ScheduleTemplate, Position, Category } from '@/lib/types';
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
  
  const categoriesColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'venues', VENUE_ID, 'categories') : null),
    [firestore]
  );

  const positionsColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'venues', VENUE_ID, 'positions') : null),
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
  const { data: positions } = useCollection<Position>(positionsColRef);
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

    initialData.categories.forEach((category) => {
        const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', category.id);
        batch.set(categoryDocRef, category);
    });

    initialData.positions.forEach((position) => {
        const positionDocRef = doc(firestore, 'venues', VENUE_ID, 'positions', position.id);
        batch.set(positionDocRef, position);
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
    const newStaff: StaffMember = { id: staffId, name, avatar, role: null, position: null };
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
            position: null,
        };

        const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
        batch.set(staffDocRef, newStaff);
    });

    await batch.commit();
  };

  const deleteStaff = async (staffId: string) => {
    if (!firestore || !scheduleColRef || !markersColRef) return;
    
    const batch = writeBatch(firestore);

    // Delete staff member
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    batch.delete(staffDocRef);

    // Remove staff from all schedules
    const scheduleQuery = query(scheduleColRef, where('staffIds', 'array-contains', staffId));
    const scheduleSnapshot = await getDocs(scheduleQuery);
    scheduleSnapshot.forEach(doc => {
      const currentStaffIds = doc.data().staffIds || [];
      const newStaffIds = currentStaffIds.filter((id: string) => id !== staffId);
      if (newStaffIds.length > 0) {
        batch.update(doc.ref, { staffIds: newStaffIds });
      } else {
        // Optionally delete schedule if no staff left, or leave it unassigned
        batch.update(doc.ref, { staffIds: [] });
      }
    });

    // Remove staff from all markers
    const markerQuery = query(markersColRef, where('staffIds', 'array-contains', staffId));
    const markerSnapshot = await getDocs(markerQuery);
    markerSnapshot.forEach(doc => {
      const currentStaffIds = doc.data().staffIds || [];
      const newStaffIds = currentStaffIds.filter((id: string) => id !== staffId);
      if (newStaffIds.length > 0) {
        batch.update(doc.ref, { staffIds: newStaffIds });
      } else {
        batch.delete(doc.ref); // Delete marker if no staff left
      }
    });
    
    await batch.commit();
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
            staffIds: item.staffIds || [],
        };
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', newId);
        batch.set(scheduleDocRef, newScheduleItem);
    });
    batch.commit();
  };

  const addRole = (name: string, categoryId: string, day: number, scheduleTemplates: ScheduleTemplate[]) => {
    if (!firestore) return;
    const newId = `role-${Date.now()}`;
    const newRole: Role = { id: newId, name, categoryId, day, scheduleTemplates };
    const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', newId);
    setDocumentNonBlocking(roleDocRef, newRole, {});
  };

  const deleteRole = async (roleId: string) => {
    if (!firestore || !staffColRef || !scheduleColRef) return;

    const batch = writeBatch(firestore);

    const roleDocRef = doc(firestore, 'venues', VENUE_ID, 'roles', roleId);
    batch.delete(roleDocRef);

    const staffQuery = query(staffColRef, where('role.id', '==', roleId));
    const staffSnapshot = await getDocs(staffQuery);

    const staffIdsWithRole: string[] = [];
    staffSnapshot.forEach(staffDoc => {
        staffIdsWithRole.push(staffDoc.id);
        batch.update(staffDoc.ref, { role: null });
    });
    
    if (staffIdsWithRole.length > 0) {
        for (let i = 0; i < staffIdsWithRole.length; i += 30) {
            const chunk = staffIdsWithRole.slice(i, i + 30);
            const scheduleQuery = query(scheduleColRef, where('staffIds', 'array-contains-any', chunk));
            const scheduleSnapshot = await getDocs(scheduleQuery);
            scheduleSnapshot.forEach(scheduleDoc => {
                const currentStaffIds = scheduleDoc.data().staffIds || [];
                const newStaffIds = currentStaffIds.filter((id: string) => !chunk.includes(id));
                if(newStaffIds.length > 0) {
                    batch.update(scheduleDoc.ref, { staffIds: newStaffIds });
                } else {
                    batch.delete(scheduleDoc.ref);
                }
            });
        }
    }

    await batch.commit();
  };

  const assignRoleToStaff = async (staffIds: string[], roleId: string) => {
    if (!firestore || !staffColRef || !scheduleColRef || staffIds.length === 0) return;
    
    const roleToAssign = roles?.find(r => r.id === roleId);
    if (!roleToAssign) return;

    const batch = writeBatch(firestore);

    // 1. Update role for all selected staff
    staffIds.forEach(staffId => {
      const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
      batch.update(staffDocRef, { role: { id: roleToAssign.id, name: roleToAssign.name } });
    });

    // 2. Delete all old schedules for these staff members for the specific day of the role
    for (let i = 0; i < staffIds.length; i += 30) {
      const chunk = staffIds.slice(i, i + 30);
      const q = query(scheduleColRef, where('staffIds', 'array-contains-any', chunk), where('day', '==', roleToAssign.day));
      const oldSchedulesSnapshot = await getDocs(q);
      oldSchedulesSnapshot.forEach(doc => {
        const currentStaffIds = doc.data().staffIds || [];
        const newStaffIds = currentStaffIds.filter((id: string) => !chunk.includes(id));
        if (newStaffIds.length > 0) {
          batch.update(doc.ref, { staffIds: newStaffIds });
        } else {
          batch.delete(doc.ref);
        }
      });
    }
    
    // 3. Add new schedules based on the role template
    if (roleToAssign.scheduleTemplates) {
      const relevantTemplates = roleToAssign.scheduleTemplates.filter(t => t.day === roleToAssign.day);
      
      const groupedTemplates = relevantTemplates.reduce((acc, tpl) => {
        const key = `${tpl.day}-${tpl.time}-${tpl.event}-${tpl.location}`;
        if (!acc[key]) {
          acc[key] = { ...tpl, staffIds: [] };
        }
        return acc;
      }, {} as Record<string, ScheduleTemplate & { staffIds: string[] }>);
      
      for (const key in groupedTemplates) {
        const template = groupedTemplates[key];
        const scheduleId = `sch-${template.day}-${(template.time || '').replace(':', '')}-${(template.event || '').slice(0,5).replace(/\s/g, '')}-${Math.random().toString(36).substr(2, 5)}`;
        const newSchedule: ScheduleItem = {
          id: scheduleId,
          day: template.day,
          time: template.time,
          event: template.event,
          location: template.location,
          staffIds: staffIds, 
        };
        const scheduleDocRef = doc(firestore, 'venues', VENUE_ID, 'schedules', scheduleId);
        batch.set(scheduleDocRef, newSchedule);
      }
    }
    
    await batch.commit();
  };

  const addCategory = (name: string) => {
    if (!firestore) return;
    const newId = `cat-${Date.now()}`;
    const newCategory: Category = { id: newId, name };
    const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', newId);
    setDocumentNonBlocking(categoryDocRef, newCategory, {});
  };

  const updateCategory = async (id: string, name: string) => {
    if (!firestore || !rolesColRef) return;
    const batch = writeBatch(firestore);
    const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', id);
    batch.update(categoryDocRef, { name });
    
    await batch.commit();
  };
  
  const deleteCategory = async (id: string) => {
    if (!firestore || !rolesColRef) return;

    const batch = writeBatch(firestore);

    // Delete category doc
    const categoryDocRef = doc(firestore, 'venues', VENUE_ID, 'categories', id);
    batch.delete(categoryDocRef);
    
    // Find roles in this category and update them
    const q = query(rolesColRef, where('categoryId', '==', id));
    const rolesSnapshot = await getDocs(q);
    rolesSnapshot.forEach(doc => {
      batch.update(doc.ref, { categoryId: '' }); // or a default categoryId
    });

    await batch.commit();
  };

  const addPosition = (name: string, color: string) => {
    if (!firestore) return;
    const newId = `pos-${Date.now()}`;
    const newPosition: Position = { id: newId, name, color };
    const positionDocRef = doc(firestore, 'venues', VENUE_ID, 'positions', newId);
    setDocumentNonBlocking(positionDocRef, newPosition, {});
  };

  const updatePosition = (positionId: string, data: Partial<Position>) => {
    if (!firestore) return;
    const positionDocRef = doc(firestore, 'venues', VENUE_ID, 'positions', positionId);
    updateDocumentNonBlocking(positionDocRef, data);
  };
  
  const deletePosition = async (positionId: string) => {
    if (!firestore || !staffColRef) return;
    const batch = writeBatch(firestore);
    const positionDocRef = doc(firestore, 'venues', VENUE_ID, 'positions', positionId);
    batch.delete(positionDocRef);

    const q = query(staffColRef, where('position.id', '==', positionId));
    const staffSnapshot = await getDocs(q);
    staffSnapshot.forEach(doc => {
      batch.update(doc.ref, { position: null });
    });

    await batch.commit();
  };
  
  const assignPositionToStaff = (staffId: string, position: Position | null) => {
    if (!firestore) return;
    const staffDocRef = doc(firestore, 'venues', VENUE_ID, 'staff', staffId);
    updateDocumentNonBlocking(staffDocRef, { position });
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
    // Check if a marker for this combo already exists
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

  const memoizedData: VenueData = useMemo(() => {
    const staffWithDetails = staff?.map(s => {
      const assignedRole = roles?.find(r => r.id === s.role?.id);
      const assignedPosition = positions?.find(p => p.id === s.position?.id);
      return { 
        ...s, 
        role: assignedRole || s.role || null,
        position: assignedPosition || s.position || null,
      };
    }) || [];
    
    return {
      staff: staffWithDetails ? [...staffWithDetails].sort((a,b) => a.id.localeCompare(b.id)) : [],
      roles: roles ? [...roles].sort((a, b) => a.name.localeCompare(b.name)) : [],
      categories: categories ? [...categories].sort((a,b) => a.name.localeCompare(b.name)) : [],
      positions: positions ? [...positions].sort((a, b) => a.name.localeCompare(b.name)) : [],
      schedule: schedule ? [...schedule].sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)) : [],
      markers: markers || [],
      maps: maps || [],
      notification: venueDoc?.notification || '',
    };
  }, [staff, roles, categories, positions, schedule, markers, maps, venueDoc]);

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
    updateMapImage, _
    initializeFirestoreData, 
    addRole,
    deleteRole,
    assignRoleToStaff,
    addCategory,
    updateCategory,
    deleteCategory,
    addPosition,
    updatePosition,
    deletePosition,
    assignPositionToStaff,
    isLoading: !venueDoc || !staff || !roles || !categories || !positions || !schedule || !markers || !maps, 
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
