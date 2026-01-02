
"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
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

  const sessionsColRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sessions') : null),
    [firestore]
  );
  const { data: sessions, isLoading: sessionsLoading } = useCollection<Session>(sessionsColRef);
  
  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeSessionId');
    }
    return null;
  });

  useEffect(() => {
    if (!sessionId && sessions && sessions.length > 0) {
      const firstId = sessions[0].id;
      setSessionIdState(firstId);
      localStorage.setItem('activeSessionId', firstId);
    }
    if (sessionId && sessions && !sessions.some(s => s.id === sessionId)) {
        const firstId = sessions.length > 0 ? sessions[0].id : null;
        setSessionIdState(firstId);
        if (firstId) {
            localStorage.setItem('activeSessionId', firstId);
        } else {
            localStorage.removeItem('activeSessionId');
        }
    }

  }, [sessions, sessionId]);
  
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

      // Clear target collection first
      const existingDocs = await getDocs(targetColRef);
      existingDocs.forEach(doc => batch.delete(doc.ref));

      // Copy from source to target
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
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
