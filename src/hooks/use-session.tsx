
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import type { Session } from '@/lib/types';
import { useToast } from './use-toast';

const VENUE_ID = 'main-venue';

interface SessionContextType {
  sessions: Session[];
  sessionId: string | null;
  publicSessionId: string | null;
  setSessionId: (id: string) => void;
  isLoading: boolean;
  updateSessionName: (id: string, newName: string) => void;
  importDataFromSession: (sourceSessionId: string) => Promise<void>;
  setPublicSession: (sessionId: string | null) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const sessionsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'sessions'), where('ownerId', '==', user.uid)) : null),
    [firestore, user]
  );
  
  const { data: sessions, isLoading: sessionsLoading } = useCollection<Session>(sessionsQuery);
  const [publicSessionId, setPublicSessionId] = useState<string | null>(null);
  const [isPublicSessionLoading, setIsPublicSessionLoading] = useState(true);

  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeSessionId');
    }
    return null;
  });

  const fetchPublicSession = useCallback(async () => {
    if (!firestore || !user) return;
    setIsPublicSessionLoading(true);
    const q = query(
        collection(firestore, 'sessions'), 
        where('ownerId', '==', user.uid)
    );
    const sessionSnapshot = await getDocs(q);
    let foundPublic = false;
    for (const sessionDoc of sessionSnapshot.docs) {
        const venueRef = doc(firestore, 'sessions', sessionDoc.id, 'venue', VENUE_ID);
        const venueSnap = await getDoc(venueRef);
        if (venueSnap.exists() && venueSnap.data().isPublic) {
            setPublicSessionId(sessionDoc.id);
            foundPublic = true;
            break;
        }
    }
    if (!foundPublic) {
        setPublicSessionId(null);
    }
    setIsPublicSessionLoading(false);
  }, [firestore, user]);

  useEffect(() => {
    fetchPublicSession();
  }, [fetchPublicSession]);


  useEffect(() => {
    const activeId = localStorage.getItem('activeSessionId');
    if (sessions) {
      const validSessionIds = sessions.map(s => s.id);
      if (activeId && validSessionIds.includes(activeId)) {
        if (sessionId !== activeId) {
          setSessionIdState(activeId);
        }
      } else if (validSessionIds.length > 0) {
        const firstId = validSessionIds[0];
        setSessionIdState(firstId);
        localStorage.setItem('activeSessionId', firstId);
      } else if (sessionId !== null) { // Only update if it needs changing
        setSessionIdState(null);
        localStorage.removeItem('activeSessionId');
      }
    }
  }, [sessions, sessionId]);
  
  const setSessionId = useCallback((id: string) => {
    setSessionIdState(id);
    localStorage.setItem('activeSessionId', id);
    if (!window.location.search.includes('sid=')) {
        window.location.reload();
    }
  }, []);

  const updateSessionName = async (id: string, newName: string) => {
    if (!firestore || !newName.trim()) {
        toast({ title: '오류', description: '차수 이름은 비워둘 수 없습니다.', variant: 'destructive'});
        return;
    };
    const sessionRef = doc(firestore, 'sessions', id);
    await updateDoc(sessionRef, { name: newName });
    toast({ title: '성공', description: '차수 이름이 업데이트되었습니다.'});
  };

  const importDataFromSession = async (sourceSessionId: string) => {
    if (!firestore || !sessionId || !sourceSessionId) return;

    const collectionsToCopy = ['venue', 'staff', 'roles', 'schedules', 'maps', 'markers'];
    const batch = writeBatch(firestore);

    for (const collectionName of collectionsToCopy) {
      const sourceColRef = collection(firestore, 'sessions', sourceSessionId, collectionName);
      const targetColRef = collection(firestore, 'sessions', sessionId, collectionName);

      const existingDocs = await getDocs(targetColRef);
      existingDocs.forEach(d => batch.delete(d.ref));

      const sourceDocs = await getDocs(sourceColRef);
      sourceDocs.forEach(d => {
        const newDocRef = doc(targetColRef, d.id);
        batch.set(newDocRef, d.data());
      });
    }

    await batch.commit();
  };

  const setPublicSession = async (newPublicSessionId: string | null) => {
    if (!firestore || !user) return;

    const batch = writeBatch(firestore);
    
    if (publicSessionId && publicSessionId !== newPublicSessionId) {
        const oldVenueRef = doc(firestore, 'sessions', publicSessionId, 'venue', VENUE_ID);
        batch.update(oldVenueRef, { isPublic: false });
    }

    if (newPublicSessionId && newPublicSessionId !== 'none') {
        const newVenueRef = doc(firestore, 'sessions', newPublicSessionId, 'venue', VENUE_ID);
        batch.update(newVenueRef, { isPublic: true });
        setPublicSessionId(newPublicSessionId);
        toast({ title: '공개 차수 변경됨', description: '뷰어에게 보여지는 차수가 업데이트되었습니다.'});
    } else {
        setPublicSessionId(null);
        toast({ title: '공개 차수 없음', description: '뷰어에게 보여지는 차수가 없습니다.'});
    }

    await batch.commit();
    // No need to fetch again, state is updated optimistically
  };

  const sortedSessions = useMemo(() => {
    return sessions ? [...sessions].sort((a, b) => a.id.localeCompare(b.id)) : [];
  }, [sessions]);

  return (
    <SessionContext.Provider value={{ sessions: sortedSessions, sessionId, publicSessionId, setSessionId, isLoading: sessionsLoading || isPublicSessionLoading, updateSessionName, importDataFromSession, setPublicSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};
