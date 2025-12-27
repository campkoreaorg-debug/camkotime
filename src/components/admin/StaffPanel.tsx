
"use client";

import { useState, useRef, useEffect } from 'react';
import { Trash2, Upload, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
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

export function StaffPanel() {
  const { data, addStaffBatch, deleteStaff, initializeFirestoreData, isLoading } = useVenueData();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
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
        description: `${staffToDelete.name} 스태프 및 관련 데이터가 삭제되었습니다.`
      })
    }
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className='space-y-1.5'>
                <CardTitle className="font-headline text-2xl font-semibold">스태프 관리</CardTitle>
                <CardDescription>
                    총 <Badge variant="secondary">{data.staff.length}</Badge>명의 스태프가 등록되었습니다.
                </CardDescription>
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
                <ScrollArea className="h-auto w-full">
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-4 p-1">
                    {data.staff.map((s, index) => (
                        <div key={s.id} className="relative group flex flex-col items-center gap-1">
                            <span className="absolute -top-1 -left-1 z-10 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                            </span>
                            <Avatar className='h-16 w-16 border-2 border-transparent group-hover:border-primary transition-all'>
                                <AvatarImage src={s.avatar} alt={s.name} />
                                <AvatarFallback><User className='h-8 w-8 text-muted-foreground'/></AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium truncate w-full text-center">{s.name}</p>
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteConfirmation(s)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                    </div>
                    <div className="h-4" /> 
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
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
                    이 작업은 되돌릴 수 없습니다. <span className="font-bold">{staffToDelete?.name}</span> 스태프와 모든 시간대의 마커 데이터가 영구적으로 삭제됩니다.
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
