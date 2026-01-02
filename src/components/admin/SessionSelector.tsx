
"use client";

import { useSession } from '@/hooks/use-session';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit, Check, X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function SessionSelector() {
  const { sessions, sessionId, setSessionId, isLoading, updateSessionName } = useSession();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleEditClick = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    updateSessionName(id, editingName);
    setEditingId(null);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(null);
  };

  if (isLoading) {
    return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> <span>로딩중...</span></div>;
  }
  
  if (!sessions || sessions.length === 0) {
    return <div className="text-sm text-muted-foreground">사용 가능한 차수가 없습니다.</div>
  }

  return (
    <Select value={sessionId ?? ''} onValueChange={setSessionId}>
      <SelectTrigger className="w-[180px] font-bold">
        <SelectValue placeholder="차수를 선택하세요..." />
      </SelectTrigger>
      <SelectContent>
        {sessions.map((session) => (
          <SelectItem key={session.id} value={session.id}>
            <div className="flex justify-between items-center w-full">
              {editingId === session.id ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Input 
                    value={editingName} 
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-7"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(e, session.id);
                        if (e.key === 'Escape') handleCancel(e);
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleSave(e, session.id)}><Check className="h-4 w-4 text-green-500" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}><X className="h-4 w-4 text-red-500" /></Button>
                </div>
              ) : (
                <>
                  <span>{session.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-50 hover:opacity-100"
                    onClick={(e) => handleEditClick(e, session.id, session.name)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
