
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Edit, User, Copy, ClipboardPaste } from 'lucide-react';
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
import type { ScheduleItem, StaffMember } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Checkbox } from '../ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import VenueMap from '../VenueMap';


const scheduleSchema = z.object({
  event: z.string().min(1, '이벤트 내용을 입력해주세요.'),
  location: z.string().optional(),
  staffId: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

type ClipboardItem = Omit<ScheduleItem, 'id' | 'day' | 'time'>;

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
  const { data, addSchedule, updateSchedule, deleteSchedule, deleteSchedulesBatch, pasteSchedules } = useVenueData();
  const { toast } = useToast();
  
  const [selectedSlot, setSelectedSlot] = useState<{ day: number, time: string} | null>(null);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);

  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);
  const [activeTab, setActiveTab] = useState('day-0');

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { event: '', location: '', staffId: '' },
  });

  useEffect(() => {
    const now = new Date();
    const currentDay = parseInt(activeTab.split('-')[1], 10);
    
    if (!selectedSlot || selectedSlot.day !== currentDay) {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        let timeString: string;
        if (minutes < 30) {
          timeString = `${String(hours).padStart(2, '0')}:00`;
        } else {
          timeString = `${String(hours).padStart(2, '0')}:30`;
        }

        if (timeSlots.includes(timeString)) {
            setSelectedSlot({ day: currentDay, time: timeString });
        }
    }
  }, [activeTab, selectedSlot]);

  const handleSelectSlot = (day: number, time: string) => {
    setSelectedSlot({ day, time });
    setEditingItem(null);
    form.reset({ event: '', location: '', staffId: ''});
    setSelectedScheduleIds([]); // 다른 슬롯 선택 시 선택 해제
  }

  const handleEditClick = (item: ScheduleItem) => {
    setEditingItem(item);
    form.reset({ event: item.event, location: item.location || '', staffId: item.staffId || '' });
    setSelectedScheduleIds([]); // 수정 시작 시 선택 해제
  };
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    form.reset({ event: '', location: '', staffId: ''});
  }

  const onSubmit = (values: ScheduleFormValues) => {
    if (!selectedSlot) return;

    const currentItems = data.schedule.filter(s => s.day === selectedSlot.day && s.time === selectedSlot.time);

    if (editingItem) {
      const updatedItem = { ...editingItem, ...values };
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
    form.reset({ event: '', location: '', staffId: ''});
  };
  
  const handleDeleteConfirmation = (item: ScheduleItem) => {
    setItemToDelete(item);
    setItemsToDelete([]);
    setIsAlertOpen(true);
  };
  
  const handleBulkDeleteConfirmation = () => {
    if (selectedScheduleIds.length === 0) return;
    setItemsToDelete(selectedScheduleIds);
    setItemToDelete(null);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (itemToDelete) {
        deleteSchedule(itemToDelete.id);
        if (selectedSlot) {
            const remainingItems = data.schedule.filter(i => i.day === selectedSlot.day && i.time === selectedSlot.time && i.id !== itemToDelete.id);
            if (remainingItems.length === 0) {
                setSelectedSlot(null);
            }
        }
    } else if (itemsToDelete.length > 0) {
        deleteSchedulesBatch(itemsToDelete);
        setSelectedScheduleIds([]);
    }

    setIsAlertOpen(false);
    setItemToDelete(null);
    setItemsToDelete([]);
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSelectedSlot(null);
    setEditingItem(null);
    form.reset();
    setSelectedScheduleIds([]);
    setClipboard([]);
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

  const handleCheckboxChange = (itemId: string) => {
    setSelectedScheduleIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };
  
  const handleCopy = () => {
    const itemsToCopy = data.schedule
      .filter(item => selectedScheduleIds.includes(item.id))
      .map(({ id, day, time, ...rest }) => rest);
    setClipboard(itemsToCopy);
    toast({
      title: "복사 완료",
      description: `${itemsToCopy.length}개의 스케줄이 복사되었습니다.`,
    });
  };

  const handlePaste = () => {
    if (!selectedSlot || clipboard.length === 0) return;
    pasteSchedules(selectedSlot.day, selectedSlot.time, clipboard);
    toast({
        title: "붙여넣기 완료",
        description: `${clipboard.length}개의 스케줄이 ${selectedSlot.day}일차 ${selectedSlot.time}에 추가되었습니다.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl font-semibold">스케줄 및 지도 관리</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="day-0" value={activeTab} onValueChange={handleTabChange}>
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
                    <div className="p-4 space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-headline text-lg font-semibold text-center">
                                    {selectedSlot.day}일차 {selectedSlot.time} 스케줄 입력
                                </h3>
                                {selectedScheduleIds.length > 0 && (
                                    <div className='flex gap-2'>
                                        <Button size="sm" variant="outline" onClick={handleCopy}><Copy className='mr-2' /> 복사</Button>
                                        <Button size="sm" variant="destructive" onClick={handleBulkDeleteConfirmation}><Trash2 className='mr-2' /> 선택 삭제</Button>
                                    </div>
                                )}
                            </div>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="flex gap-2 items-start">
                                    <div className='flex-grow'>
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
                                    
                                    <Controller
                                      control={form.control}
                                      name="staffId"
                                      render={({ field }) => (
                                        <Select
                                          onValueChange={(value) => field.onChange(value === 'unassigned' ? '' : value)}
                                          value={field.value || 'unassigned'}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="담당자 선택" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="unassigned">담당자 없음</SelectItem>
                                            {data.staff.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                  <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                      <AvatarImage src={s.avatar} alt={s.name} />
                                                      <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{s.name}</span>
                                                  </div>
                                                </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    />
                                    {!editingItem && (
                                      <Button type="submit">등록</Button>
                                    )}
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    {editingItem ? (
                                        <div className="flex justify-end gap-2">
                                            <Button type="submit">저장</Button>
                                            <Button type="button" variant="ghost" onClick={handleCancelEdit}>취소</Button>
                                        </div>
                                    ) : (
                                        <div /> 
                                    )}
                                     {clipboard.length > 0 && !editingItem && (
                                        <Button type="button" variant="secondary" onClick={handlePaste}>
                                            <ClipboardPaste className='mr-2' />
                                            {clipboard.length}개 항목 붙여넣기
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          {displayedSchedules.map(({ time, items }) => {
                            const isCurrent = time === selectedSlot.time;
                            return (
                                <div key={time} className={`p-4 rounded-lg border ${isCurrent ? 'bg-muted/60 border-primary md:col-span-3' : 'bg-muted/20 md:col-span-1'}`}>
                                    <h4 className="font-semibold text-center mb-3">{time}</h4>
                                    <div className="space-y-2 min-h-[50px]">
                                        {items.map(item => {
                                            const assignedStaff = data.staff.find(s => s.id === item.staffId);
                                            return (
                                            <div key={item.id} className="p-2 rounded-md border bg-background flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    {isCurrent && (
                                                      <Checkbox
                                                        id={`select-${item.id}`}
                                                        checked={selectedScheduleIds.includes(item.id)}
                                                        onCheckedChange={() => handleCheckboxChange(item.id)}
                                                        aria-label={`Select item ${item.event}`}
                                                      />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">{item.event}</p>
                                                        <div className='flex items-center gap-2 mt-1'>
                                                            {assignedStaff ? (
                                                                <>
                                                                    <Avatar className="h-5 w-5">
                                                                        <AvatarImage src={assignedStaff.avatar} alt={assignedStaff.name} />
                                                                        <AvatarFallback>{assignedStaff.name.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <p className="text-xs text-muted-foreground">{assignedStaff.name}</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <User className='h-4 w-4 text-muted-foreground' />
                                                                    <p className="text-xs text-muted-foreground">담당자 미지정</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
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
                                        )})}
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
                    {itemToDelete 
                        ? `이 작업은 되돌릴 수 없습니다. "${itemToDelete.event}" 이벤트를 영구적으로 삭제합니다.`
                        : `이 작업은 되돌릴 수 없습니다. 선택한 ${itemsToDelete.length}개의 스케줄을 영구적으로 삭제합니다.`
                    }
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

    