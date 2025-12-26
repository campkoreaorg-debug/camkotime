"use client";

import { useState, useRef } from 'react';
import { PlusCircle, Trash2, Upload, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

export function StaffPanel() {
  const { data, addStaffBatch, deleteStaff } = useVenueData();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteConfirmation = (staff: StaffMember) => {
    setStaffToDelete(staff);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!staffToDelete) return;
    deleteStaff(staffToDelete.id);
    setIsAlertOpen(false);
    setStaffToDelete(null);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const imagePromises = Array.from(files).map(file => {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit
        toast({
          variant: 'destructive',
          title: '이미지 크기 초과',
          description: `${file.name} 파일은 1MB를 초과할 수 없습니다.`,
        });
        return null;
      }
      return new Promise<{ name: string; avatar: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const name = file.name.split('.').slice(0, -1).join('.') || 'Unknown';
            resolve({ name, avatar: reader.result as string });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
        const newStaffMembers = (await Promise.all(imagePromises)).filter(Boolean) as { name: string; avatar: string }[];
        if (newStaffMembers.length > 0) {
            await addStaffBatch(newStaffMembers);
            toast({
                title: '성공',
                description: `${newStaffMembers.length}명의 스태프가 추가되었습니다.`,
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "업로드 실패",
            description: "이미지 처리 중 오류가 발생했습니다.",
        });
    } finally {
        setIsUploading(false);
        // Reset file input
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className='space-y-1'>
                <CardTitle className="font-headline text-2xl font-semibold">스태프 관리</CardTitle>
                <p className="text-muted-foreground">
                    총 <Badge variant="secondary">{data.staff.length}</Badge>명의 스태프가 등록되었습니다.
                </p>
            </div>
          
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>업로드 중...</span>
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        스태프 추가
                    </>
                )}
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/png, image/jpeg"
                multiple // 여러 파일 선택 허용
            />
        </CardHeader>
        <CardContent>
            {data.staff.length > 0 ? (
                <ScrollArea className="h-96 w-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-1">
                    {data.staff.map((s, index) => (
                        <div key={s.id} className="relative group flex flex-col items-center gap-2">
                            <span className="absolute -top-2 -left-2 z-10 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                            </span>
                            <Avatar className='h-24 w-24 border-2 border-transparent group-hover:border-primary transition-all'>
                                <AvatarImage src={s.avatar} alt={s.name} />
                                <AvatarFallback><User className='h-10 w-10 text-muted-foreground'/></AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-medium truncate w-full text-center">{s.name}</p>
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-0 right-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteConfirmation(s)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg">
                    <User className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">등록된 스태프가 없습니다.</p>
                    <p className="text-sm text-muted-foreground">'스태프 추가' 버튼을 눌러 이미지를 업로드하세요.</p>
                </div>
            )}
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. {staffToDelete?.name} 님을 영구적으로 삭제하고 지도에서 제거합니다.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>삭제</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
