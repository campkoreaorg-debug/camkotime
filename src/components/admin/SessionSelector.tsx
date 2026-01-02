
"use client";

import { useSession } from '@/hooks/use-session';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Edit, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

export function SessionSelector() {
  const { sessions, sessionId, setSessionId, isLoading, updateSessionName, importDataFromSession } = useSession();
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const [sourceSessionId, setSourceSessionId] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingName, setEditingName] = useState('');
  
  const { toast } = useToast();

  const currentSession = sessions.find(s => s.id === sessionId);

  useEffect(() => {
    if (currentSession) {
      setEditingName(currentSession.name);
    }
  }, [currentSession, isEditModalOpen]);


  const handleSaveName = () => {
    if (sessionId) {
      updateSessionName(sessionId, editingName);
      setIsEditModalOpen(false);
    }
  };

  const handleImportClick = () => {
    if (!sourceSessionId) {
        toast({ title: "원본 차수를 선택해주세요.", variant: "destructive" });
        return;
    }
    setIsImportDialogOpen(false);
    setIsConfirmAlertOpen(true);
  }

  const handleConfirmImport = async () => {
    if (!sourceSessionId) return;

    await importDataFromSession(sourceSessionId);

    toast({ title: "데이터 불러오기 성공", description: "페이지를 새로고침합니다." });
    
    // Give toast time to show before reload
    setTimeout(() => {
        window.location.reload();
    }, 1500);

    setIsConfirmAlertOpen(false);
    setSourceSessionId(null);
  };

  const availableSessionsForImport = sessions.filter(s => s.id !== sessionId);
  const sourceSessionName = sessions.find(s => s.id === sourceSessionId)?.name || '';
  const currentSessionName = sessions.find(s => s.id === sessionId)?.name || '';

  if (isLoading) {
    return <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> <span>로딩중...</span></div>;
  }
  
  if (!sessions || sessions.length === 0) {
    return <div className="text-sm text-muted-foreground">사용 가능한 차수가 없습니다.</div>
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={sessionId ?? ''} onValueChange={setSessionId}>
        <SelectTrigger className="w-[180px] font-bold">
          <SelectValue placeholder="차수를 선택하세요..." />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => (
            <SelectItem key={session.id} value={session.id}>
              <span>{session.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={!sessionId}>
            <Edit className="mr-2 h-4 w-4" />
            이름 수정
          </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>차수 이름 수정</DialogTitle>
                <DialogDescription>
                    현재 선택된 차수의 이름을 수정합니다.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="session-name">차수 이름</Label>
                <Input 
                    id="session-name"
                    value={editingName} 
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">취소</Button>
                </DialogClose>
                <Button onClick={handleSaveName}>저장</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!sessionId}>
                  <Copy className="mr-2 h-4 w-4" />
                  데이터 불러오기
              </Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>다른 차수에서 데이터 불러오기</DialogTitle>
                  <DialogDescription>
                      선택한 차수의 모든 데이터 (스태프, 스케줄, 역할 등)를 현재 차수로 복사합니다. 현재 차수의 데이터는 모두 덮어씌워집니다.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="source-session">원본 차수 선택</Label>
                  <Select onValueChange={setSourceSessionId}>
                      <SelectTrigger id="source-session">
                          <SelectValue placeholder="데이터를 가져올 차수를 선택하세요..." />
                      </SelectTrigger>
                      <SelectContent>
                          {availableSessionsForImport.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>취소</Button>
                  <Button onClick={handleImportClick} disabled={!sourceSessionId}>가져오기</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmAlertOpen} onOpenChange={setIsConfirmAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>정말 데이터를 덮어쓰시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                      <span className='font-bold'>{sourceSessionName}</span>의 데이터로 <span className='font-bold'>{currentSessionName}</span>의 모든 데이터를 덮어씁니다. 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmImport} variant="destructive">확인 및 실행</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
