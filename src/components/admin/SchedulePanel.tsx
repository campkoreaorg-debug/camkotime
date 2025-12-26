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
  DialogFooter,
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
  event: z.string().min(1, '이벤트 내용을 입력해주세요.'),
  location: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

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
  
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [listInfo, setListInfo] = useState<{items: ScheduleItem[], day: number, time: string} | null>(null);
  
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { event: '', location: '' },
  });

  const handleOpenListDialog = (items: ScheduleItem[], day: number, time: string) => {
    setListInfo({ items, day, time });
    setIsListDialogOpen(true);
    form.reset();
    setEditingItem(null);
  }

  const handleEditClick = (item: ScheduleItem) => {
    setEditingItem(item);
    form.reset({ event: item.event, location: item.location || '' });
  };
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    form.reset();
  }

  const onSubmit = (values: ScheduleFormValues) => {
    if (!listInfo) return;

    if (editingItem) {
      updateSchedule(editingItem.id, { ...values, location: values.location || editingItem.location });
      setEditingItem(null);
    } else {
      addSchedule({
        ...values,
        location: values.location || listInfo.items[0]?.location || 'N/A',
        day: listInfo.day,
        time: listInfo.time,
      });
    }
    form.reset();
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
    
    // If the deleted item was the last one in the list, close the dialog
    if (listInfo && listInfo.items.length === 1 && listInfo.items[0].id === itemToDelete.id) {
        setIsListDialogOpen(false);
    }
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
                        <div key={time} className="flex-shrink-0 w-48 h-40 cursor-pointer" onClick={() => handleOpenListDialog(items, day, time)}>
                           <div className="text-sm font-semibold text-center mb-1">{time}</div>
                           <div className="relative h-full border rounded-lg p-2 flex flex-col justify-center items-center text-center bg-muted/40 hover:border-primary transition-all">
                            {items.length > 0 ? (
                                <>
                                    <p className="text-sm font-bold whitespace-normal">{items[0].event}</p>
                                    <p className="text-xs text-muted-foreground whitespace-normal">{items[0].location}</p>
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

        {/* Dialog for Listing/Editing/Adding items */}
        <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline">
                        {listInfo?.day}일차 {listInfo?.time} 스케줄
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="event-input" className="sr-only">새 항목</Label>
                        <Input 
                            id="event-input"
                            placeholder={editingItem ? "항목 수정..." : "새 항목 추가 (Enter)"}
                            {...form.register('event')} 
                            autoComplete="off"
                        />
                        {form.formState.errors.event && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.event.message}</p>
                        )}
                    </div>
                    {editingItem && (
                        <div className="flex justify-end gap-2">
                            <Button type="submit">저장</Button>
                            <Button type="button" variant="ghost" onClick={handleCancelEdit}>취소</Button>
                        </div>
                    )}
                </form>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                    {listInfo?.items.map(item => (
                        <div key={item.id} className="p-3 rounded-lg border bg-muted/50 flex justify-between items-center group">
                           <div>
                             <p className="font-semibold">{item.event}</p>
                             <p className="text-sm text-muted-foreground">{item.location}</p>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                                    <Edit className="h-4 w-4"/>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirmation(item)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                           </div>
                        </div>
                    ))}
                    {listInfo?.items.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                            <p>등록된 스케줄이 없습니다.</p>
                        </div>
                    )}
                </div>
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
