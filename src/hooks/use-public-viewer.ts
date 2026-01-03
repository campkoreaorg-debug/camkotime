"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import type { VenueData, ScheduleItem, StaffMember, Role, MapInfo, MapMarker, ScheduleTemplate, TimeSlotInfo } from '@/lib/types';

export const usePublicViewer = () => {
  const firestore = useFirestore();
  const [data, setData] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;

    let unsubscribes: (() => void)[] = [];

    const setupRealtimeListeners = async () => {
      try {
        setLoading(true);

        // 1. 공개된 세션 ID 찾기
        const venueQuery = query(
          collectionGroup(firestore, 'venue'),
          where('isPublic', '==', true)
        );
        
        const snapshot = await getDocs(venueQuery);

        if (snapshot.empty) {
          setError("현재 공개된 차수가 없습니다.");
          setLoading(false);
          return;
        }

        const venueDoc = snapshot.docs[0]; 
        const sessionId = venueDoc.ref.parent.parent?.id;

        if (!sessionId) {
          setError("세션 ID 오류");
          setLoading(false);
          return;
        }

        const sessionRef = doc(firestore, 'sessions', sessionId);

        // 데이터 임시 저장 객체
        const currentData: any = {
          staff: [], roles: [], schedule: [], markers: [], maps: [], scheduleTemplates: [], timeSlotInfos: [], notification: venueDoc.data().notification || ''
        };

        const updateState = () => {
            const sortedSchedule = [...currentData.schedule].sort((a: any, b: any) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`));
            const sortedStaff = [...currentData.staff].sort((a: any, b: any) => a.id.localeCompare(b.id));
            const sortedRoles = [...currentData.roles].sort((a: any, b: any) => a.name.localeCompare(b.name));

            setData({
                ...currentData,
                schedule: sortedSchedule,
                staff: sortedStaff,
                roles: sortedRoles
            });
            setLoading(false);
        };

        // 공통 에러 핸들러 (권한 없음 등)
        const handleError = (err: any) => {
            console.error("실시간 데이터 수신 중 에러:", err);
            // 인덱스 생성 중이거나 권한 문제일 때 발생
            if (err.code === 'permission-denied') {
                setError("데이터 접근 권한이 없습니다. (새로고침 해주세요)");
            } else {
                setError("데이터를 불러오는 중 오류가 발생했습니다.");
            }
            setLoading(false);
        };

        // (1) Staff 리스너
        const unsubStaff = onSnapshot(collection(sessionRef, 'staff'), (snap) => {
            currentData.staff = snap.docs.map(d => d.data());
            updateState();
        }, handleError);

        // (2) Roles 리스너
        const unsubRoles = onSnapshot(collection(sessionRef, 'roles'), (snap) => {
            currentData.roles = snap.docs.map(d => d.data());
            updateState();
        }, handleError);

        // (3) Schedules 리스너
        const unsubSch = onSnapshot(collection(sessionRef, 'schedules'), (snap) => {
            currentData.schedule = snap.docs.map(d => d.data());
            updateState();
        }, handleError);

        // (4) Markers 리스너
        const unsubMarkers = onSnapshot(collection(sessionRef, 'markers'), (snap) => {
            currentData.markers = snap.docs.map(d => d.data());
            updateState();
        }, handleError);

        // (5) Maps 리스너
        const unsubMaps = onSnapshot(collection(sessionRef, 'maps'), (snap) => {
            currentData.maps = snap.docs.map(d => d.data());
            updateState();
        }, handleError);

         // (6) Venue 리스너
         const unsubVenue = onSnapshot(doc(sessionRef, 'venue', 'main-venue'), (snap) => {
            if(snap.exists()) {
                currentData.notification = snap.data().notification || '';
                if(snap.data().isPublic === false) {
                    setError("관리자가 공유를 중지했습니다.");
                    setData(null);
                } else {
                    updateState();
                }
            }
        }, handleError);

        // (7) TimeSlotInfo 리스너
        const unsubTimeSlotInfos = onSnapshot(collection(sessionRef, 'timeSlotInfo'), (snap) => {
            currentData.timeSlotInfos = snap.docs.map(d => d.data());
            updateState();
        }, handleError);

        unsubscribes.push(unsubStaff, unsubRoles, unsubSch, unsubMarkers, unsubMaps, unsubVenue, unsubTimeSlotInfos);

      } catch (err) {
        console.error("Realtime setup error:", err);
        setError("초기 설정 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    setupRealtimeListeners();

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
  }, [firestore]);

  return { data, loading, error };
};
