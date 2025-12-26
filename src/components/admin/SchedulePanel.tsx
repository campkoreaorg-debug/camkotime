"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Edit } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVenueData } from '@/hooks/use-venue-data';
import type { ScheduleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

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
  
  const [selectedSlot, setSelectedSlot] = useState<{items: ScheduleItem[], day: number, time: string} | null>(null);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { event: '', location: '' },
  });

  const handleSelectSlot = (items: ScheduleItem[], day: number, time: string) => {
    setSelectedSlot({ items, day, time });
    setEditingItem(null);
    form.reset();
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
    if (!selectedSlot) return;

    if (editingItem) {
      const updatedItem = { ...editingItem, ...values, location: values.location || editingItem.location };
      updateSchedule(editingItem.id, updatedItem);
       // Update selectedSlot.items
      if(selectedSlot) {
        setSelectedSlot(prev => prev ? ({ ...prev, items: prev.items.map(i => i.id === editingItem.id ? updatedItem : i) }) : null);
      }
      setEditingItem(null);

    } else {
      addSchedule({
        ...values,
        location: values.location || selectedSlot.items[0]?.location || 'N/A',
        day: selectedSlot.day,
        time: selectedSlot.time,
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

    if(selectedSlot) {
        const newItems = selectedSlot.items.filter(i => i.id !== itemToDelete.id);
        if (newItems.length === 0 && selectedSlot.items.length === 1) {
            setSelectedSlot(null);
        } else {
            setSelectedSlot(prev => prev ? ({ ...prev, items: newItems }) : null);
        }
    }

    setIsAlertOpen(false);
    setItemToDelete(null);
  };

  const handleTabChange = () => {
    setSelectedSlot(null);
    setEditingItem(null);
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">스케줄 관리</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="day-0" onValueChange={handleTabChange}>
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
              <TabsContent key={day} value={`day-${day}`} className="space-y-4">
                <ScrollArea className="w-full">
                  <div className="flex flex-wrap gap-2 pb-4">
                    {timeSlots.map(time => {
                      const items = daySchedules[time] || [];
                      const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                      return (
                        <Button 
                            key={time} 
                            variant={isSelected ? "default" : (items.length > 0 ? "secondary" : "outline")}
                            className="flex-shrink-0"
                            onClick={() => handleSelectSlot(items, day, time)}
                        >
                           {time}
                           {items.length > 0 && <span className="ml-2 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{items.length}</span>}
                        </Button>
                      )
                    })}
                  </div>
                </ScrollArea>

                {selectedSlot && selectedSlot.day === day && (
                    <>
                    <Separator />
                    <div className="p-4 space-y-4 max-w-md mx-auto">
                         <h3 className="font-headline text-lg font-semibold">
                            {selectedSlot.day}일차 {selectedSlot.time} 스케줄
                        </h3>
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
                            {selectedSlot.items.map(item => (
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
                            {selectedSlot.items.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    <p>등록된 스케줄이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    </>
                )}
              </TabsContent>
            )
          })}
        </Tabs>

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
