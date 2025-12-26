
"use client";

import { useState, useEffect, useMemo } from 'react';
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

function getAdjacentTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes, 0, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function SchedulePanel() {
  const { data, addSchedule, updateSchedule, deleteSchedule } = useVenueData();
  
  const [selectedSlot, setSelectedSlot] = useState<{ day: number, time: string} | null>(null);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { event: '', location: '' },
  });

  const handleSelectSlot = (day: number, time: string) => {
    setSelectedSlot({ day, time });
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

    const currentItems = data.schedule.filter(s => s.day === selectedSlot.day && s.time === selectedSlot.time);

    if (editingItem) {
      const updatedItem = { ...editingItem, ...values, location: values.location || editingItem.location };
      updateSchedule(editingItem.id, updatedItem);
      setEditingItem(null);
    } else {
      addSchedule({
        ...values,
        location: values.location || currentItems[0]?.location || 'N/A',
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

    // If we delete the last item in a slot, we can close the details view
    if (selectedSlot) {
        const remainingItems = data.schedule.filter(i => i.day === selectedSlot.day && i.time === selectedSlot.time && i.id !== itemToDelete.id);
        if (remainingItems.length === 0) {
            setSelectedSlot(null);
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

  const daySchedules = useMemo(() => {
    return days.map(day => {
        return data.schedule.filter(s => s.day === day).reduce((acc, item) => {
            if (!acc[item.time]) {
                acc[item.time] = [];
            }
            acc[item.time].push(item);
            return acc;
        }, {} as Record<string, ScheduleItem[]>);
    });
  }, [data.schedule]);

  const displayedSchedules = useMemo(() => {
    if (!selectedSlot) return [];
    
    const { day, time } = selectedSlot;
    const prevTime = getAdjacentTime(time, -30);
    const nextTime = getAdjacentTime(time, 30);
    
    const schedulesByTime: { time: string; items: ScheduleItem[] }[] = [];

    const prevItems = daySchedules[day]?.[prevTime] || [];
    if(timeSlots.includes(prevTime)) schedulesByTime.push({ time: prevTime, items: prevItems });

    const currentItems = daySchedules[day]?.[time] || [];
    schedulesByTime.push({ time, items: currentItems });

    const nextItems = daySchedules[day]?.[nextTime] || [];
    if(timeSlots.includes(nextTime)) schedulesByTime.push({ time: nextTime, items: nextItems });

    return schedulesByTime;
  }, [selectedSlot, daySchedules]);


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
            const currentDaySchedules = daySchedules[day] || {};

            return (
              <TabsContent key={day} value={`day-${day}`} className="space-y-4">
                <div className="flex flex-wrap gap-2 pb-4">
                  {timeSlots.map(time => {
                    const items = currentDaySchedules[time] || [];
                    const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                    return (
                      <Button 
                          key={time} 
                          variant={isSelected ? "default" : (items.length > 0 ? "secondary" : "outline")}
                          className="flex-shrink-0"
                          onClick={() => handleSelectSlot(day, time)}
                      >
                         {time}
                         {items.length > 0 && <span className="ml-2 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{items.length}</span>}
                      </Button>
                    )
                  })}
                </div>

                {selectedSlot && selectedSlot.day === day && (
                    <>
                    <Separator />
                    <div className="p-4 space-y-6 max-w-5xl mx-auto">
                        <div className="space-y-4">
                            <h3 className="font-headline text-lg font-semibold text-center">
                                {selectedSlot.day}일차 {selectedSlot.time} 스케줄 입력
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
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {displayedSchedules.map(({ time, items }) => {
                            const isCurrent = time === selectedSlot.time;
                            return (
                                <div key={time} className={`p-4 rounded-lg border ${isCurrent ? 'bg-muted/60 border-primary md:col-span-3' : 'bg-muted/20 md:col-span-1'}`}>
                                    <h4 className="font-semibold text-center mb-3">{time}</h4>
                                    <div className="space-y-2 min-h-[50px]">
                                        {items.map(item => (
                                            <div key={item.id} className="p-2 rounded-md border bg-background flex justify-between items-center group">
                                            <div>
                                                <p className="font-medium text-sm">{item.event}</p>
                                                {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                                            </div>
                                            {isCurrent && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(item)}>
                                                        <Edit className="h-3.5 w-3.5"/>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirmation(item)}>
                                                        <Trash2 className="h-3.5 w-3.5"/>
                                                    </Button>
                                                </div>
                                            )}
                                            </div>
                                        ))}
                                        {items.length === 0 && (
                                            <div className="text-center text-muted-foreground text-xs py-4">
                                                <p>스케줄 없음</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
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
