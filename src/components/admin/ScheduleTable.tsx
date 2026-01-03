
"use client";

import { useMemo } from 'react';
import type { ScheduleItem, StaffMember } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { timeSlots } from '@/hooks/use-venue-data';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleTableProps {
    schedule: ScheduleItem[];
    staff: StaffMember[];
    onToggleCompletion: (itemId: string, currentStatus: boolean) => void;
    onDelete: (item: ScheduleItem) => void;
}

const days = [0, 1, 2, 3];

export function ScheduleTable({ schedule, staff, onToggleCompletion, onDelete }: ScheduleTableProps) {
    
    const scheduleByDayAndTime = useMemo(() => {
        const grouped: Record<number, Record<string, ScheduleItem[]>> = {};
        days.forEach(d => grouped[d] = {});

        schedule.forEach(item => {
            if (!grouped[item.day]) grouped[item.day] = {};
            if (!grouped[item.day][item.time]) {
                grouped[item.day][item.time] = [];
            }
            grouped[item.day][item.time].push(item);
        });
        return grouped;
    }, [schedule]);

    const getStaffName = (staffId: string) => {
        return staff.find(s => s.id === staffId)?.name || '미지정';
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">날짜</TableHead>
                        <TableHead className="w-[100px]">시간</TableHead>
                        <TableHead>이벤트</TableHead>
                        <TableHead>위치</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead className="w-[200px] text-right">작업</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {days.map(day => (
                        timeSlots.map((time, timeIndex) => {
                            const events = scheduleByDayAndTime[day]?.[time] || [];
                            if (events.length === 0) {
                                return (
                                    <TableRow key={`${day}-${time}`}>
                                        {timeIndex === 0 && <TableCell rowSpan={timeSlots.length} className="font-bold align-top pt-4">{day}일차</TableCell>}
                                        <TableCell className="text-muted-foreground">{time}</TableCell>
                                        <TableCell colSpan={4} className="text-muted-foreground text-center">예정된 스케줄 없음</TableCell>
                                    </TableRow>
                                );
                            }
                            return events.map((event, eventIndex) => (
                                <TableRow key={event.id} className={cn(event.isCompleted && "bg-muted/50")}>
                                    {timeIndex === 0 && eventIndex === 0 && <TableCell rowSpan={timeSlots.length} className="font-bold align-top pt-4">{day}일차</TableCell>}
                                    {eventIndex === 0 && <TableCell rowSpan={events.length} className="align-top pt-4">{time}</TableCell>}
                                    <TableCell className={cn(event.isCompleted && "line-through text-muted-foreground")}>{event.event}</TableCell>
                                    <TableCell className={cn(event.isCompleted && "line-through text-muted-foreground")}>{event.location || '-'}</TableCell>
                                    <TableCell>
                                        <div className='flex flex-wrap gap-1'>
                                            {(event.staffIds || []).map(staffId => (
                                                <Badge key={staffId} variant="secondary">{getStaffName(staffId)}</Badge>
                                            ))}
                                            {(event.staffIds || []).length === 0 && <Badge variant="outline">미지정</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant={event.isCompleted ? "secondary" : "outline"} size="sm" className='h-8 mr-2' onClick={() => onToggleCompletion(event.id, !!event.isCompleted)}>
                                            {event.isCompleted ? <CheckCircle className='mr-2 h-4 w-4'/> : <Circle className='mr-2 h-4 w-4'/>}
                                            {event.isCompleted ? '완료취소' : '완료'}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(event)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ));
                        })
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
