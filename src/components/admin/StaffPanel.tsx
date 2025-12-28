
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, User, Loader2, Plus, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PendingStaff {
    key: string;
    name: string;
    avatarDataUrl: string;
}

export function StaffPanel() {
  const { data, addStaffBatch, deleteStaff, initializeFirestoreData, isLoading } = useVenueData();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && data.staff.length === 0) {
      initializeFirestoreData();
    }
  }, [isLoading, data.staff, initializeFirestoreData]);

  const handleDeleteConfirmation = (staff: StaffMember) => {
    setStaffToDelete(staff);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (staffToDelete) {
      deleteStaff(staffToDelete.id);
      toast({
        title: "삭제 완료",
        description: `${staffToDelete.name} 스태프와 모든 관련 데이터가 삭제되었습니다.`
      })
    }
    setIsAlertOpen(false);
    setStaffToDelete(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const avatarDataUrl = event.target?.result as string;
            setPendingStaff(prev => [
                ...prev,
                { key: `pending-${Date.now()}-${index}`, name: '', avatarDataUrl }
            ]);
        };
        reader.readAsDataURL(file);
    });
    
    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const updatePendingStaffName = (key: string, name: string) => {
    setPendingStaff(prev => prev.map(p => p.key === key ? { ...p, name } : p));
  };

  const removePendingStaff = (key: string) => {
    setPendingStaff(prev => prev.filter(p => p.key !== key));
  };

  const handleRegisterAll = async () => {
    const newStaffMembers = pendingStaff.map(p => ({ name: p.name, avatar: p.avatarDataUrl }));
    await addStaffBatch(newStaffMembers);
    toast({
        title: '일괄 등록 완료',
        description: `${newStaffMembers.length}명의 스태프가 성공적으로 등록되었습니다.`
    });
    setPendingStaff([]);
  };

  const canRegister = pendingStaff.length > 0 && pendingStaff.every(p => p.name.trim() !== '');

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl font-semibold">스태프 관리</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className='space-y-1.5'>
                <CardTitle className="font-headline text-2xl font-semibold">스태프 관리</CardTitle>
                <CardDescription>
                    총 <Badge variant="secondary">{data.staff.length}</Badge>명의 스태프가 등록되었습니다.
                </CardDescription>
            </div>
             <Button onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className='mr-2 h-4 w-4' />
                이미지 추가
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                onChange={handleFileSelect} 
                accept="image/*"
            />
        </CardHeader>
        <CardContent className='space-y-6'>
            {pendingStaff.length > 0 && (
                <div className='space-y-4 p-4 border rounded-lg bg-muted/20'>
                    <div className='flex justify-between items-center'>
                        <h4 className='font-semibold'>등록 대기중인 스태프</h4>
                        <Button 
                            onClick={handleRegisterAll}
                            disabled={!canRegister}
                        >
                           <Upload className='mr-2 h-4 w-4'/> {pendingStaff.length}명 스태프 등록하기
                        </Button>
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {pendingStaff.map((p) => (
                            <div key={p.key} className='flex items-center gap-3 p-2 border rounded-md bg-background'>
                                <Avatar>
                                    <AvatarImage src={p.avatarDataUrl} />
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                                <Input 
                                    placeholder='스태프 이름'
                                    value={p.name}
                                    onChange={(e) => updatePendingStaffName(p.key, e.target.value)}
                                    className='flex-grow'
                                />
                                <Button variant="ghost" size="icon" className='h-8 w-8 shrink-0' onClick={() => removePendingStaff(p.key)}>
                                    <X className='h-4 w-4'/>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.staff.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(theme(spacing.24),1fr))] gap-4 p-1">
                {data.staff.map((s, index) => (
                    <div key={s.id} className="relative group flex flex-col items-center gap-2 rounded-md border p-3 text-center">
                        <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                        </span>
                        <Avatar className='h-12 w-12'>
                            <AvatarImage src={s.avatar} alt={s.name} />
                            <AvatarFallback><User className='h-6 w-6 text-muted-foreground'/></AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                            <p className="font-semibold text-sm">{s.name}</p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteConfirmation(s)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                </div>
            ) : (
                 pendingStaff.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                        <User className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">등록된 스태프가 없습니다. 이미지를 추가하여 시작하세요.</p>
                    </div>
                )
            )}
        </CardContent>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다. <span className="font-bold">{staffToDelete?.name}</span> 스태프와 모든 관련 데이터가 영구적으로 삭제됩니다.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>삭제</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
}

    