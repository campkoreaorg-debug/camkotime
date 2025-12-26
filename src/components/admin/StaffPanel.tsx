"use client";

import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, Trash2, Upload } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

const editStaffSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
  role: z.enum(['Security', 'Medical', 'Operations', 'Info']),
});

const addStaffSchema = z.object({
    name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.'),
});

export function StaffPanel() {
  const { data, addStaff, updateStaff, deleteStaff } = useVenueData();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editForm = useForm<z.infer<typeof editStaffSchema>>({
    resolver: zodResolver(editStaffSchema),
  });

  const addForm = useForm<z.infer<typeof addStaffSchema>>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: { name: '' },
  });
  
  const handleEditDialogOpen = (staff: StaffMember | null = null) => {
    setEditingStaff(staff);
    if (staff) {
      editForm.reset({ name: staff.name, role: staff.role });
    }
    setIsEditDialogOpen(true);
  };
  
  const handleAddDialogOpen = () => {
    addForm.reset({ name: '' });
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsAddDialogOpen(true);
  }

  const onEditSubmit = (values: z.infer<typeof editStaffSchema>) => {
    if (editingStaff) {
      updateStaff(editingStaff.id, values);
    }
    setIsEditDialogOpen(false);
  };

  const onAddSubmit = (values: z.infer<typeof addStaffSchema>) => {
    if (!avatarFile) {
        toast({ variant: "destructive", title: "오류", description: "이미지를 업로드해주세요." });
        return;
    }
    addStaff(values.name, avatarFile);
    setIsAddDialogOpen(false);
  };

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

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit
        toast({
          variant: 'destructive',
          title: '이미지 크기 초과',
          description: '이미지 파일은 1MB를 초과할 수 없습니다.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setAvatarFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-headline font-semibold">스태프 관리</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddDialogOpen}>
              <PlusCircle className="mr-2 h-4 w-4" /> 스태프 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">새 스태프 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <div className='space-y-2'>
                    <Label>스태프 사진</Label>
                    <div className='flex items-center gap-4'>
                        <Avatar className='h-20 w-20'>
                            {avatarPreview ? <AvatarImage src={avatarPreview} /> : <AvatarFallback><User className='h-10 w-10 text-muted-foreground'/></AvatarFallback>}
                        </Avatar>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            이미지 업로드
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            className="hidden"
                            accept="image/png, image/jpeg"
                        />
                    </div>
                </div>
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" {...addForm.register('name')} />
                {addForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{addForm.formState.errors.name.message}</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">취소</Button>
                </DialogClose>
                <Button type="submit">저장</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">스태프 정보 수정</DialogTitle>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" {...editForm.register('name')} />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">역할</Label>
                 <Controller
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                            <SelectValue placeholder="역할을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Security">보안</SelectItem>
                            <SelectItem value="Medical">의료</SelectItem>
                            <SelectItem value="Operations">운영</SelectItem>
                            <SelectItem value="Info">안내</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {editForm.formState.errors.role && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.role.message}</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">취소</Button>
                </DialogClose>
                <Button type="submit">저장</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className='bg-card p-2 rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>아바타</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>역할</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.staff.map((s) => {
             const roleKorean = {
                Security: '보안',
                Medical: '의료',
                Operations: '운영',
                Info: '안내',
             }[s.role]
            return (
                <TableRow key={s.id}>
                    <TableCell>
                        <Avatar>
                            <AvatarImage src={s.avatar} alt={s.name} />
                            <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{roleKorean}</TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">메뉴 열기</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDialogOpen(s)}>
                            수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteConfirmation(s)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> 삭제
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

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
