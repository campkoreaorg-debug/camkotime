"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Edit, X } from 'lucide-react';
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
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  
  const [editingInfo, setEditingInfo] = useState<{item: ScheduleItem | null, day: number, time: string} | null>(null);
  const [listInfo, setListInfo] = useState<{items: ScheduleItem[], day: number, time: string} | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
  });

  const handleOpenFormDialog = (info: {item: ScheduleItem | null, day: number, time: string}) => {
    setEditingInfo(info);
    if (info.item) {
      form.reset({ event: info.item.event, location: info.item.location });
    } else {
      form.reset({ event: '', location: '' });
    }
    setIsListDialogOpen(false); // Close list dialog if open
    setIsFormDialogOpen(true);
  };
  
  const handleOpenListDialog = (items: ScheduleItem[], day: number, time: string) => {
    setListInfo({ items, day, time });
    setIsListDialogOpen(true);
  }

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
    setIsFormDialogOpen(false);
    setEditingInfo(null);
    // After submit, we might need to refresh the list dialog if it was open
    // For simplicity, we just close it. A better UX would be to update it in place.
    setIsListDialogOpen(false); 
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
     // After delete, we might need to refresh the list dialog
    setIsListDialogOpen(false);
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
                if (!acc[item.time]) {
                    acc[item.time] = [];
                }
                acc[item.time].push(item);
                return acc;
            }, {} as Record<string, ScheduleItem[]>);

            return (
              <TabsContent key={day} value={`day-${day}`}>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex space-x-2 pb-4">
                    {timeSlots.map(time => {
                      const items = daySchedules[time] || [];
                      return (
                        <div key={time} className="flex-shrink-0 w-48 h-40 cursor-pointer" onClick={() => items.length > 0 ? handleOpenListDialog(items, day, time) : handleOpenFormDialog({item: null, day, time})}>
                           <div className="text-sm font-semibold text-center mb-1">{time}</div>
                           <div className="relative h-full border rounded-lg p-2 flex flex-col justify-center items-center text-center bg-muted/40 hover:border-primary transition-all">
                            {items.length > 0 ? (
                                <>
                                    <p className="text-sm font-bold">{items[0].event}</p>
                                    <p className="text-xs text-muted-foreground">{items[0].location}</p>
                                    {items.length > 1 && (
                                        <div className="absolute bottom-2 right-2 text-xs font-bold bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                                            {items.length}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Plus className="h-6 w-6 text-muted-foreground"/>
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

        {/* Dialog for Creating/Editing an item */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
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
        
        {/* Dialog for Listing items */}
        <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline">
                        {listInfo?.day}일차 {listInfo?.time} 스케줄
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {listInfo?.items.map(item => (
                        <div key={item.id} className="p-3 rounded-lg border bg-muted/50 flex justify-between items-start">
                           <div>
                             <p className="font-semibold">{item.event}</p>
                             <p className="text-sm text-muted-foreground">{item.location}</p>
                           </div>
                           <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenFormDialog({item, day: item.day, time: item.time})}>
                                    <Edit className="h-4 w-4"/>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirmation(item)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                           </div>
                        </div>
                    ))}
                </div>
                 <DialogFooter>
                    <Button onClick={() => listInfo && handleOpenFormDialog({item: null, day: listInfo.day, time: listInfo.time})}>
                        <Plus className="mr-2 h-4 w-4" />
                        새 스케줄 추가
                    </Button>
                </DialogFooter>
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
