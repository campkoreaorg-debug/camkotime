"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
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
import { useVenueData } from '@/hooks/use-venue-data';
import type { ScheduleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const scheduleSchema = z.object({
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s(AM|PM)$/, '잘못된 시간 형식 (예: 09:00 AM)'),
  event: z.string().min(2, '이벤트 이름은 최소 2자 이상이어야 합니다'),
  location: z.string().min(2, '장소는 최소 2자 이상이어야 합니다'),
});

export function SchedulePanel() {
  const { data, addSchedule, updateSchedule, deleteSchedule } = useVenueData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
  });

  const handleDialogOpen = (item: ScheduleItem | null = null) => {
    setEditingItem(item);
    if (item) {
      form.reset({ time: item.time, event: item.event, location: item.location });
    } else {
      form.reset({ time: '', event: '', location: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof scheduleSchema>) => {
    if (editingItem) {
      updateSchedule(editingItem.id, values);
    } else {
      addSchedule(values);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteConfirmation = (item: ScheduleItem) => {
    setItemToDelete(item);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    deleteSchedule(itemToDelete.id);
    setIsAlertOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-4">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-headline text-2xl font-semibold">스케줄 관리</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => handleDialogOpen()}>
                <PlusCircle className="mr-2 h-4 w-4" /> 이벤트 추가
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle className="font-headline">
                    {editingItem ? '스케줄 이벤트 수정' : '새 스케줄 이벤트 추가'}
                </DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="time">시간</Label>
                    <Input id="time" placeholder="예: 09:00 AM" {...form.register('time')} />
                    {form.formState.errors.time && (
                    <p className="text-sm text-destructive">{form.formState.errors.time.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="event">이벤트</Label>
                    <Input id="event" {...form.register('event')} />
                    {form.formState.errors.event && (
                    <p className="text-sm text-destructive">{form.formState.errors.event.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">장소</Label>
                    <Input id="location" {...form.register('location')} />
                    {form.formState.errors.location && (
                    <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
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
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>이벤트</TableHead>
                    <TableHead>장소</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {data.schedule.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.time}</TableCell>
                    <TableCell>{item.event}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">메뉴 열기</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDialogOpen(item)}>수정</DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteConfirmation(item)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> 삭제
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. "{itemToDelete?.event}" 이벤트를 영구적으로 삭제합니다.
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
