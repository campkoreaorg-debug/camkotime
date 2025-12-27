
"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, User, Loader2, Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember, RoleKorean } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const roles: RoleKorean[] = ['보안', '의료', '운영', '안내'];

const staffSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  role: z.enum(['보안', '의료', '운영', '안내']),
});

type StaffFormValues = z.infer<typeof staffSchema>;

export function StaffPanel() {
  const { data, addStaff, deleteStaff, updateStaffRole, initializeFirestoreData, isLoading } = useVenueData();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', role: '운영' },
  });

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
  
  const handleAddStaff = async (values: StaffFormValues) => {
      const avatarOptions = PlaceHolderImages.filter(img => img.id.startsWith('avatar-'));
      const randomAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)].imageUrl;
      
      await addStaff(values.name, values.role, randomAvatar);
      toast({
          title: '성공',
          description: `${values.name} 스태프가 ${values.role} 직책으로 추가되었습니다.`,
      });
      form.reset();
  }
  
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
        </CardHeader>
        <CardContent className='space-y-6'>
            <form onSubmit={form.handleSubmit(handleAddStaff)} className="flex items-end gap-2">
                <div className='flex-grow space-y-1'>
                    <Label htmlFor="name">스태프 이름</Label>
                    <Input id="name" placeholder="예: 홍길동" {...form.register('name')} />
                </div>
                <div className='space-y-1'>
                    <Label htmlFor="role">직책</Label>
                    <Controller
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="직책 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <Button type="submit"><Plus className='mr-2 h-4 w-4' />추가</Button>
            </form>
            {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}

            {data.staff.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 p-1">
                {data.staff.map((s, index) => (
                    <div key={s.id} className="relative group flex items-center gap-3 rounded-md border p-2">
                        <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                        </span>
                        <Avatar className='h-12 w-12'>
                            <AvatarImage src={s.avatar} alt={s.name} />
                            <AvatarFallback><User className='h-6 w-6 text-muted-foreground'/></AvatarFallback>
                        </Avatar>
                        <div className='flex-1'>
                            <p className="font-semibold">{s.name}</p>
                            <Select defaultValue={s.role} onValueChange={(newRole) => updateStaffRole(s.id, newRole as RoleKorean)}>
                                <SelectTrigger className="h-7 text-xs mt-1 w-full">
                                    <SelectValue placeholder="직책" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <User className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">등록된 스태프가 없습니다.</p>
                </div>
            )}
        </CardContent>
      </Card>
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
    </div>
  );
}
