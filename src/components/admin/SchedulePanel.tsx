
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Edit, Copy, ClipboardPaste, Link as LinkIcon, Users, User, ShieldAlert, UserSearch, X, Download, CheckCircle, Circle, ExternalLink, Info } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import Papa from 'papaparse';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useSession } from '@/hooks/use-session';


const scheduleSchema = z.object({
  event: z.string().min(1, '이벤트 내용을 입력해주세요.'),
  location: z.string().optional(),
  staffIds: z.array(z.string()).optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

type ClipboardItem = Omit<ScheduleItem, 'id' | 'day' | 'time'>;

interface SchedulePanelProps {
    selectedSlot: { day: number, time: string } | null;
    itinerary?: string;
}

export function SchedulePanel({ selectedSlot, itinerary }: SchedulePanelProps) {
  const { data, addSchedule, updateSchedule, deleteSchedule, deleteSchedulesBatch, pasteSchedules, deleteAllSchedules, toggleScheduleCompletion } = useVenueData();
  const { toast } = useToast();
  const { sessionId } = useSession();
  
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ScheduleItem | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);

  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);
  const [filteredStaffId, setFilteredStaffId] = useState<string | null>(null);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const eventInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { event: '', location: '', staffIds: [] },
  });

  useEffect(() => {
    // When selectedSlot changes, clear editing state and selections
    setEditingItem(null);
    form.reset({ event: '', location: '', staffIds: [] });
    setSelectedScheduleIds([]);
  }, [selectedSlot, form]);


  const handleEditClick = (e: React.MouseEvent, item: ScheduleItem) => {
    e.stopPropagation(); // Prevent row selection when clicking edit
    setEditingItem(item);
    form.reset({ event: item.event, location: item.location || '', staffIds: item.staffIds || [] });
    setSelectedScheduleIds([]); // 수정 시작 시 선택 해제
    eventInputRef.current?.focus();
  };
  
  const handleCancelEdit = () => {
    setEditingItem(null);
    form.reset({ event: '', location: '', staffIds: [] });
  }

  const onSubmit = (values: ScheduleFormValues) => {
    if (!selectedSlot) return;
  
    const scheduleData: Omit<ScheduleItem, 'id'> = {
      ...values,
      day: selectedSlot.day,
      time: selectedSlot.time,
      staffIds: values.staffIds || [],
    };

    if (editingItem) {
      updateSchedule(editingItem.id, scheduleData);
      toast({ title: '수정 완료', description: '스케줄이 수정되었습니다.'});
      setEditingItem(null);
    } else {
      addSchedule(scheduleData);
      toast({ title: '추가 완료', description: '스케줄이 추가되었습니다.'});
    }
    form.reset({ event: '', location: '', staffIds: [] });
    eventInputRef.current?.focus();
  };
  
  const handleDeleteConfirmation = (e: React.MouseEvent, item: ScheduleItem) => {
    e.stopPropagation();
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
    } else if (itemsToDelete.length > 0) {
        deleteSchedulesBatch(itemsToDelete);
        setSelectedScheduleIds([]);
    }

    setIsAlertOpen(false);
    setItemToDelete(null);
    setItemsToDelete([]);
  };

  const handleDeleteAll = () => {
    deleteAllSchedules();
    toast({
        title: "전체 삭제 완료",
        description: "모든 스케줄이 삭제되었습니다."
    });
    setIsDeleteAllAlertOpen(false);
  }

  const scheduleByDay = useMemo(() => {
    if (!data?.schedule) return [{}, {}, {}, {}];
    return [0, 1, 2, 3].map(day => {
        return data.schedule.filter(s => s.day === day).reduce((acc, item) => {
            if (!acc[item.time]) {
                acc[item.time] = [];
            }
            acc[item.time].push(item);
            return acc;
        }, {} as Record<string, ScheduleItem[]>);
    });
  }, [data]);


  const handleItemClick = (itemId: string) => {
    // If editing, don't allow selection
    if (editingItem) return;

    setSelectedScheduleIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };
  
  const handleCopy = () => {
    if(!selectedSlot || !data) return;
    const itemsToCopy = data.schedule
      .filter(item => selectedScheduleIds.includes(item.id))
      .map(({ id, day, time, ...rest }) => rest);
    setClipboard(itemsToCopy);
    toast({
      title: "복사 완료",
      description: `${itemsToCopy.length}개의 스케줄이 복사되었습니다. 다른 시간대에 붙여넣을 수 있습니다.`,
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

  const handleDownload = () => {
    if (!selectedSlot || !data) return;
    const day = selectedSlot.day;
    const schedulesToDownload = data.schedule.filter(s => s.day === day);

    if (schedulesToDownload.length === 0) {
      toast({
        variant: "destructive",
        title: "데이터 없음",
        description: "다운로드할 스케줄이 없습니다.",
      });
      return;
    }

    const csvData = schedulesToDownload.flatMap(item => 
        (item.staffIds?.length || 0) > 0
        ? item.staffIds.map(staffId => ({
            '일차': item.day,
            '시간': item.time,
            '이벤트': item.event,
            '위치': item.location || '',
            '담당자': data.staff.find(s => s.id === staffId)?.name || '미지정',
          }))
        : [{
            '일차': item.day,
            '시간': item.time,
            '이벤트': item.event,
            '위치': item.location || '',
            '담당자': '미지정',
          }]
      );

    const csv = Papa.unparse(csvData);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${day}일차_스케줄.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
        title: '다운로드 완료',
        description: `${day}일차 스케줄이 다운로드되었습니다.`,
    })
  };

  const currentDaySchedules = useMemo(() => {
    if (!selectedSlot) return {};
    const day = selectedSlot.day;
    return scheduleByDay[day] || {};
  }, [scheduleByDay, selectedSlot]);

  const displayedSchedules = useMemo(() => {
    if (!selectedSlot || !currentDaySchedules[selectedSlot.time]) {
      return [];
    }
    const slotSchedules = currentDaySchedules[selectedSlot.time];
    if (filteredStaffId) {
      return slotSchedules.filter(item => item.staffIds && item.staffIds.includes(filteredStaffId));
    }
    return slotSchedules;
  }, [selectedSlot, currentDaySchedules, filteredStaffId]);

  const selectedStaffForFilter = useMemo(() => {
      if (!filteredStaffId || !data) return null;
      return data.staff.find(s => s.id === filteredStaffId);
  }, [filteredStaffId, data]);
  const { ref: formRef, ...restFormProps } = form.register('event');

  const openScheduleWindow = () => {
    if (!sessionId) {
        alert("먼저 차수(Session)를 선택해주세요.");
        return;
    }
    window.open(`/schedule?sid=${sessionId}`, '_blank', 'width=1280,height=800,resizable=yes,scrollbars=yes');
  };

  return (
    <Card className='lg:col-span-1'>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-2xl font-semibold">스케줄 관리</CardTitle>
              <CardDescription>전역 시간대 설정에 따라 스케줄을 관리하세요.</CardDescription>
                {itinerary && (
                    <div className="mt-2 text-sm font-semibold text-primary flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <span>{itinerary}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={openScheduleWindow}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    따로 보기
               </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className='mr-2 h-4 w-4' />
                  엑셀 다운로드
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setIsDeleteAllAlertOpen(true)}>
                  <ShieldAlert className='mr-2 h-4 w-4' />
                  전체 삭제
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {selectedSlot && data ? (
                <div className="pt-4 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-headline text-lg font-semibold text-center">
                                {selectedSlot.day}일차 {selectedSlot.time} 스케줄
                            </h3>
                            <div className='flex gap-2'>
                                <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button size="sm" variant="outline"><UserSearch className='mr-2 h-4 w-4' /> 선택 보기</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-2">
                                        <div className="mb-2 flex justify-between items-center px-2">
                                            <h4 className="font-medium text-sm">스태프로 필터링</h4>
                                            <Button variant="ghost" size="sm" onClick={() => { setFilteredStaffId(null); setIsFilterPopoverOpen(false); }}>전체 보기</Button>
                                        </div>
                                        <ScrollArea className="h-[200px]">
                                        <div className='space-y-1'>
                                        {data.staff.map(staff => (
                                            <div key={staff.id} 
                                                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                                                onClick={() => { setFilteredStaffId(staff.id); setIsFilterPopoverOpen(false); }}
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={staff.avatar} alt={staff.name} />
                                                    <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium">{staff.name}</span>
                                                {/* <span className="text-xs text-muted-foreground">{staff.role?.name}</span> */}
                                            </div>
                                        ))}
                                        </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>

                                {selectedScheduleIds.length > 0 && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={handleCopy}><Copy className='mr-2 h-4 w-4' /> 복사</Button>
                                    <Button size="sm" variant="destructive" onClick={handleBulkDeleteConfirmation}><Trash2 className='mr-2 h-4 w-4' /> 선택 삭제</Button>
                                  </>
                                )}
                                {clipboard.length > 0 && !editingItem && selectedScheduleIds.length === 0 && (
                                    <Button size="sm" variant="secondary" onClick={handlePaste}>
                                        <ClipboardPaste className='mr-2 h-4 w-4' />
                                        {clipboard.length}개 붙여넣기
                                    </Button>
                                )}
                            </div>
                        </div>

                        {filteredStaffId && selectedStaffForFilter && (
                            <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-muted text-sm">
                                <UserSearch className="h-4 w-4 text-primary" />
                                <p className="text-muted-foreground">
                                    <span className="font-bold text-primary">{selectedStaffForFilter.name}</span>님의 스케줄만 보는 중
                                </p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFilteredStaffId(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="flex gap-2 items-start">
                                <div className='flex-grow'>
                                    <Label htmlFor="event-input" className="sr-only">새 항목</Label>
                                    <Input 
                                      id="event-input"
                                      placeholder={editingItem ? "항목 수정..." : "새 항목 추가 (Enter)"}
                                      
                                      {...restFormProps} 
                                      
                                      ref={(e) => {
                                          formRef(e);
                                          eventInputRef.current = e;
                                      }}
                                      
                                      autoComplete="off"
                                  />
                                    {form.formState.errors.event && (
                                        <p className="text-sm text-destructive mt-1">{form.formState.errors.event.message}</p>
                                    )}
                                </div>
                                
                                <Button type="submit">
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only">{editingItem ? '저장' : '등록'}</span>
                                </Button>
                                {editingItem && (
                                    <Button type="button" variant="ghost" onClick={handleCancelEdit}>취소</Button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="space-y-2 min-h-[50px]">
                        {displayedSchedules.length > 0 ? (
                            displayedSchedules.map(item => {
                                const assignedStaff = data.staff.filter(s => item.staffIds && item.staffIds.includes(s.id));
                                const isSelected = selectedScheduleIds.includes(item.id);
                                const isEditingThis = editingItem?.id === item.id;
                                
                                const getStaffRoleName = (staffId: string) => {
                                    if (!data.schedule) return '';
                                    const staffSchedule = data.schedule.find(s => 
                                        s.day === item.day && 
                                        s.time === item.time && 
                                        s.staffIds.includes(staffId) &&
                                        s.roleName
                                    );
                                    return staffSchedule?.roleName || null;
                                };

                                return (
                                <div 
                                    key={item.id} 
                                    className={cn(
                                        "p-3 rounded-md border flex justify-between items-center group transition-colors",
                                        !isEditingThis && "cursor-pointer hover:bg-muted/60",
                                        isSelected && !isEditingThis && "bg-primary/10 border-primary",
                                        isEditingThis && "bg-amber-100/50"
                                    )}
                                    onClick={() => handleItemClick(item.id)}
                                >
                                    <div className="flex flex-col items-start gap-2 flex-1">
                                        <p className={cn("font-medium text-sm", item.isCompleted && "line-through text-muted-foreground")}>{item.event}</p>
                                        <div className='flex items-center gap-2'>
                                            <Users className='h-4 w-4 text-muted-foreground' />
                                            {assignedStaff.length > 0 ? (
                                                <p className="text-xs text-muted-foreground">
                                                {assignedStaff.map(staff => {
                                                    const roleName = getStaffRoleName(staff.id);
                                                    return `${staff.name}${roleName ? ` (${roleName})` : ''}`;
                                                }).join(', ')}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">담당자 미지정</p>
                                            )}
                                        </div>
                                    </div>
                                    {!isEditingThis && (
                                        <div className="flex gap-1">
                                             <Button variant={item.isCompleted ? "secondary" : "outline"} size="sm" className='h-7' onClick={(e) => { e.stopPropagation(); toggleScheduleCompletion(item.id)}}>
                                                {item.isCompleted ? <><CheckCircle className='mr-2 h-4 w-4' /> 완료취소</> : <><Circle className='mr-2 h-4 w-4' />완료</>}
                                            </Button>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleEditClick(e, item)}>
                                                    <Edit className="h-3.5 w-3.5"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => handleDeleteConfirmation(e, item)}>
                                                    <Trash2 className="h-3.5 w-3.5"/>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})
                        ) : (
                            <div className="text-center text-muted-foreground text-xs py-4">
                                <p>{filteredStaffId ? '해당 스태프의 스케줄이 없습니다.' : '스케줄 없음'}</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>상단에서 날짜와 시간대를 선택하여 스케줄을 확인하세요.</p>
                </div>
            )}
        </CardContent>

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
      <AlertDialog open={isDeleteAllAlertOpen} onOpenChange={setIsDeleteAllAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>정말로 모든 스케줄을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. 이 베뉴의 모든 스케줄을 영구적으로 삭제합니다.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll} className='bg-destructive hover:bg-destructive/90'>전체 삭제</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
