
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import type { Session } from '@/lib/types';
import { useToast } from './use-toast';

interface SessionContextType {
  sessions: Session[];
  sessionId: string | null;
  setSessionId: (id: string) => void;
  isLoading: boolean;
  updateSessionName: (id: string, newName: string) => void;
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
    // If there's no session ID, but sessions have loaded, default to the first one.
    if (!sessionId && sessions && sessions.length > 0) {
      const firstId = sessions[0].id;
      setSessionIdState(firstId);
      localStorage.setItem('activeSessionId', firstId);
    }
     // If the selected session ID is no longer valid, reset it.
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
    // Reload to ensure all components refetch data with the new session ID
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

  const sortedSessions = useMemo(() => {
    return sessions ? [...sessions].sort((a, b) => a.id.localeCompare(b.id)) : [];
  }, [sessions]);

  return (
    <SessionContext.Provider value={{ sessions: sortedSessions, sessionId, setSessionId, isLoading: sessionsLoading, updateSessionName }}>
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
