"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import type { Session } from '@/lib/types';
import { useToast } from './use-toast';

interface SessionContextType {
  sessions: Session[];
  sessionId: string | null;
  setSessionId: (id: string) => void;
  isLoading: boolean;
  updateSessionName: (id: string, newName: string) => void;
  importDataFromSession: (sourceSessionId: string) => Promise<void>;
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
  
  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeSessionId');
    }
    return null;
  });

  useEffect(() => {
    const activeId = localStorage.getItem('activeSessionId');
    if (sessions) {
      const validSessionIds = sessions.map(s => s.id);
      if (activeId && validSessionIds.includes(activeId)) {
        setSessionIdState(activeId);
      } else if (validSessionIds.length > 0) {
        const firstId = validSessionIds[0];
        setSessionIdState(firstId);
        localStorage.setItem('activeSessionId', firstId);
      } else {
        setSessionIdState(null);
        localStorage.removeItem('activeSessionId');
      }
    }
  }, [sessions]);
  
  const setSessionId = (id: string) => {
    setSessionIdState(id);
    localStorage.setItem('activeSessionId', id);
    window.location.reload(); 
  };

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
      existingDocs.forEach(doc => batch.delete(doc.ref));

      const sourceDocs = await getDocs(sourceColRef);
      sourceDocs.forEach(d => {
        const newDocRef = doc(targetColRef, d.id);
        batch.set(newDocRef, d.data());
      });
    }

    await batch.commit();
  };


  const sortedSessions = useMemo(() => {
    return sessions ? [...sessions].sort((a, b) => a.id.localeCompare(b.id)) : [];
  }, [sessions]);

  return (
    <SessionContext.Provider value={{ sessions: sortedSessions, sessionId, setSessionId, isLoading: sessionsLoading, updateSessionName, importDataFromSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    // This allows the hook to be used in pages like /map
    // which might not be wrapped in the provider, but can get the
    // session ID from the URL.
    return {
        sessions: [],
        sessionId: null,
        setSessionId: () => {},
        isLoading: false,
        updateSessionName: () => {},
        importDataFromSession: async () => {},
    };
  }
  return context;
};
