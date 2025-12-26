"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Edit } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

const scheduleSchema = z.object({
  event: z.string().min(2, '이벤트 이름은 최소 2자 이상이어야 합니다'),
  location: z.string().min(2, '장소는 최소 2자 이상이어야 합니다'),
});

const generateTimeSlots = () => {
    const slots = [];
    for (let h = 7; h < 24; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push('00:00');
    return slots;
}

const timeSlots = generateTimeSlots();
const days = [0, 1, 2, 3];

export function SchedulePanel() {
  const { data, addSchedule, updateSchedule, deleteSchedule } = useVenueData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<{item: ScheduleItem | null, day: number, time: string} | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
  });

  const handleDialogOpen = (info: {item: ScheduleItem | null, day: number, time: string}) => {
    setEditingInfo(info);
    if (info.item) {
      form.reset({ event: info.item.event, location: info.item.location });
    } else {
      form.reset({ event: '', location: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof scheduleSchema>) => {
    if (!editingInfo) return;

    if (editingInfo.item) {
      updateSchedule(editingInfo.item.id, values);
    } else {
      addSchedule({
        ...values,
        day: editingInfo.day,
        time: editingInfo.time,
      });
    }
    setIsDialogOpen(false);
    setEditingInfo(null);
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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">스케줄 관리</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="day-0">
          <TabsList>
            {days.map(day => (
              <TabsTrigger key={day} value={`day-${day}`}>{day}일차</TabsTrigger>
            ))}
          </TabsList>
          {days.map(day => {
            const daySchedules = data.schedule.filter(s => s.day === day).reduce((acc, item) => {
                acc[item.time] = item;
                return acc;
            }, {} as Record<string, ScheduleItem>);

            return (
              <TabsContent key={day} value={`day-${day}`}>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex space-x-2 pb-4">
                    {timeSlots.map(time => {
                      const item = daySchedules[time];
                      return (
                        <div key={time} className="flex-shrink-0 w-48 h-40">
                           <div className="text-sm font-semibold text-center mb-1">{time}</div>
                           <div className="relative h-full border rounded-lg p-2 flex flex-col justify-center items-center text-center bg-muted/40">
                            {item ? (
                                <>
                                    <p className="text-sm font-bold">{item.event}</p>
                                    <p className="text-xs text-muted-foreground">{item.location}</p>
                                    <div className="absolute top-1 right-1 flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDialogOpen({item, day, time})}>
                                            <Edit className="h-3 w-3"/>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirmation(item)}>
                                            <Trash2 className="h-3 w-3"/>
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => handleDialogOpen({item: null, day, time})}>
                                    <Plus className="h-6 w-6 text-muted-foreground"/>
                                </Button>
                            )}
                           </div>
                        </div>
                      )
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </TabsContent>
            )
          })}
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle className="font-headline">
                    {editingInfo?.item ? '스케줄 수정' : '새 스케줄 추가'}
                </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {editingInfo?.day}일차 {editingInfo?.time}
                </p>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="event">이벤트</Label>
                    <Input id="event" placeholder="이벤트 이름" {...form.register('event')} />
                    {form.formState.errors.event && (
                    <p className="text-sm text-destructive">{form.formState.errors.event.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location">장소</Label>
                    <Input id="location" placeholder="이벤트 장소" {...form.register('location')} />
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

      </CardContent>
    </Card>
  );
}
