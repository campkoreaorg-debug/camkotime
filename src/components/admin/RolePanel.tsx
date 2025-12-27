
"use client";

import { useState, useMemo } from 'react';
import { Calendar, Users, Edit, Plus, UserCheck } from 'lucide-react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { ScheduleItem, StaffMember, Role } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { timeSlots } from './SchedulePanel';

const days = [0, 1, 2, 3];

export function RolePanel() {
    const { data, addRole, assignRoleToStaff } = useVenueData();
    const { toast } = useToast();

    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);

    const [newRoleName, setNewRoleName] = useState('');
    const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
    
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    const scheduleByDayTime = useMemo(() => {
        const grouped: Record<string, ScheduleItem[]> = {};
        data.schedule.forEach(item => {
            const key = `${item.day}-${item.time}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(item);
        });
        return grouped;
    }, [data.schedule]);
    
    const handleToggleSchedule = (scheduleId: string) => {
        setSelectedScheduleIds(prev =>
            prev.includes(scheduleId)
                ? prev.filter(id => id !== scheduleId)
                : [...prev, scheduleId]
        );
    };

    const handleCreateRole = () => {
        if (!newRoleName.trim()) {
            toast({ variant: 'destructive', title: '직책 이름을 입력해주세요.' });
            return;
        }
        if (selectedScheduleIds.length === 0) {
            toast({ variant: 'destructive', title: '하나 이상의 스케줄을 선택해주세요.' });
            return;
        }
        
        const scheduleTemplates = selectedScheduleIds.map(id => {
            const schedule = data.schedule.find(s => s.id === id);
            if (!schedule) return null;
            const { id: scheduleId, day, time, ...template } = schedule;
            return template;
        }).filter(Boolean) as Omit<ScheduleItem, 'id' | 'day' | 'time'>[];
        
        addRole(newRoleName, scheduleTemplates);

        toast({ title: '성공', description: `새 직책 '${newRoleName}'이(가) 생성되었습니다.` });
        setIsCreateRoleModalOpen(false);
        setNewRoleName('');
        setSelectedScheduleIds([]);
    };

    const handleAssignRole = () => {
        if (!selectedStaffId || !selectedRoleId) {
            toast({ variant: 'destructive', title: '스태프와 직책을 모두 선택해주세요.' });
            return;
        }
        assignRoleToStaff(selectedStaffId, selectedRoleId);
        toast({ title: '성공', description: '직책이 배정되었습니다. 해당 스태프의 스케줄이 업데이트됩니다.' });
        setIsAssignRoleModalOpen(false);
        setSelectedStaffId(null);
        setSelectedRoleId(null);
    }
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-2xl font-semibold">직책 관리</CardTitle>
                    <CardDescription>
                        총 <Badge variant="secondary">{data.roles.length}</Badge>개의 직책이 있습니다.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(true)}><Plus className="mr-2 h-4 w-4"/>직책 생성</Button>
                    <Button onClick={() => setIsAssignRoleModalOpen(true)}><UserCheck className="mr-2 h-4 w-4"/>직책 배정</Button>
                </div>
            </CardHeader>
            <CardContent>
                {data.roles.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
                        {data.roles.map(role => (
                            <div key={role.id} className="p-3 rounded-md border bg-muted/30 flex items-center gap-3">
                                <Users className="h-5 w-5 text-primary" />
                                <p className="font-semibold text-sm">{role.name}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>생성된 직책이 없습니다.</p>
                    </div>
                )}
            </CardContent>

            {/* 직책 생성 모달 */}
            <Dialog open={isCreateRoleModalOpen} onOpenChange={setIsCreateRoleModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>새 직책 생성</DialogTitle>
                        <DialogDescription>
                            새로운 직책의 이름을 입력하고, 해당 직책에 할당할 기본 스케줄을 선택하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <Label htmlFor="role-name">직책 이름</Label>
                            <Input
                                id="role-name"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder="예: 무대 감독"
                            />
                            <div className='p-4 border rounded-lg bg-muted/20'>
                                <h4 className='font-semibold mb-2'>선택된 스케줄: {selectedScheduleIds.length}개</h4>
                                <ScrollArea className='h-60'>
                                    <div className='space-y-1 pr-2'>
                                    {selectedScheduleIds.map(id => {
                                        const item = data.schedule.find(s => s.id === id);
                                        return item ? <div key={id} className='text-xs p-1 bg-primary/10 rounded-sm'>{item.day}일차 {item.time} - {item.event}</div> : null;
                                    })}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <Label>전체 스케줄에서 선택</Label>
                             <ScrollArea className="h-[400px] border rounded-lg p-2">
                                {days.map(day => (
                                    <div key={day} className='mb-4'>
                                        <h4 className="font-bold text-sm mb-2 p-1 bg-muted rounded-md">Day {day}</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {timeSlots.map(time => {
                                                const key = `${day}-${time}`;
                                                const schedules = scheduleByDayTime[key] || [];
                                                return schedules.length > 0 ? (
                                                    <div key={key}>
                                                        <p className='font-medium text-xs text-muted-foreground mb-1'>{time}</p>
                                                        {schedules.map(schedule => (
                                                            <div 
                                                                key={schedule.id} 
                                                                className={`p-1.5 border rounded-md text-xs cursor-pointer mb-1 ${selectedScheduleIds.includes(schedule.id) ? 'bg-primary/20 border-primary' : 'bg-background'}`}
                                                                onClick={() => handleToggleSchedule(schedule.id)}
                                                            >
                                                                {schedule.event}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(false)}>취소</Button>
                        <Button onClick={handleCreateRole}>직책 생성</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* 직책 배정 모달 */}
             <Dialog open={isAssignRoleModalOpen} onOpenChange={setIsAssignRoleModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>직책 배정</DialogTitle>
                        <DialogDescription>
                            스태프에게 직책을 배정합니다. 배정 시 해당 직책의 스케줄이 스태프에게 자동으로 할당됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>스태프 선택</Label>
                            <Select onValueChange={setSelectedStaffId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="배정할 스태프를 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.role?.name || '직책 없음'})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>직책 선택</Label>
                             <Select onValueChange={setSelectedRoleId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="배정할 직책을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.roles.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignRoleModalOpen(false)}>취소</Button>
                        <Button onClick={handleAssignRole}>배정하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
