
"use client";

import { useState, useMemo, useRef } from 'react';
import { Calendar, Users, Edit, Plus, UserCheck, Upload } from 'lucide-react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { ScheduleItem, StaffMember, Role, ScheduleTemplate } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Papa from 'papaparse';

const days = [0, 1, 2, 3];

export function RolePanel() {
    const { data, addRole, assignRoleToStaff } = useVenueData();
    const { toast } = useToast();

    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);

    const [newRoleName, setNewRoleName] = useState('');
    const [selectedTemplates, setSelectedTemplates] = useState<ScheduleTemplate[]>([]);
    
    const [uploadedData, setUploadedData] = useState<Record<number, ScheduleTemplate[]>>({});
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    const handleFileUpload = (day: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const templates = results.data.map((row, index): ScheduleTemplate | null => {
                    const time = row['시간'] || row['time'];
                    const event = row['이벤트'] || row['event'];
                    const location = row['위치'] || row['location'];
                    
                    if (time && event) {
                        return { day, time, event, location: location || '' };
                    }
                    return null;
                }).filter((t): t is ScheduleTemplate => t !== null);

                setUploadedData(prev => ({ ...prev, [day]: templates }));
                toast({ title: '업로드 완료', description: `${day}일차 스케줄 ${templates.length}개를 불러왔습니다.` });
            },
            error: (error) => {
                toast({ variant: 'destructive', title: '파싱 오류', description: error.message });
            },
        });
    };
    
    const handleToggleTemplate = (template: ScheduleTemplate) => {
        setSelectedTemplates(prev => {
            const exists = prev.some(t => t.day === template.day && t.time === template.time && t.event === template.event);
            if (exists) {
                return prev.filter(t => !(t.day === template.day && t.time === template.time && t.event === template.event));
            } else {
                return [...prev, template];
            }
        });
    };

    const handleCreateRole = () => {
        if (!newRoleName.trim()) {
            toast({ variant: 'destructive', title: '직책 이름을 입력해주세요.' });
            return;
        }
        if (selectedTemplates.length === 0) {
            toast({ variant: 'destructive', title: '하나 이상의 스케줄을 선택해주세요.' });
            return;
        }
        
        addRole(newRoleName, selectedTemplates);

        toast({ title: '성공', description: `새 직책 '${newRoleName}'이(가) 생성되었습니다.` });
        
        // Reset state after creation
        setIsCreateRoleModalOpen(false);
        setNewRoleName('');
        setSelectedTemplates([]);
        setUploadedData({});
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
                            CSV 업로드를 통해 직책에 할당할 스케줄 템플릿을 선택하세요. CSV 파일은 '시간', '이벤트', '위치' 헤더를 포함해야 합니다.
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
                                <h4 className='font-semibold mb-2'>선택된 스케줄 템플릿: {selectedTemplates.length}개</h4>
                                <ScrollArea className='h-60'>
                                    <div className='space-y-1 pr-2'>
                                    {selectedTemplates.sort((a,b) => `${a.day}-${a.time}`.localeCompare(`${b.day}-${b.time}`)).map((template, index) => (
                                         <div key={index} className='text-xs p-1 bg-primary/10 rounded-sm'>
                                            {template.day}일차 {template.time} - {template.event}
                                         </div>
                                    ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <Label>스케줄 템플릿 선택</Label>
                             <Tabs defaultValue="day-0">
                                <TabsList className="grid w-full grid-cols-4">
                                    {days.map(day => (
                                        <TabsTrigger key={`day-tab-${day}`} value={`day-${day}`}>Day {day}</TabsTrigger>
                                    ))}
                                </TabsList>
                                {days.map(day => (
                                    <TabsContent key={`day-content-${day}`} value={`day-${day}`}>
                                        <div className="space-y-2">
                                            <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[day]?.click()}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Day {day} CSV 업로드
                                            </Button>
                                            <input 
                                                type="file" 
                                                ref={el => fileInputRefs.current[day] = el}
                                                className="hidden"
                                                accept=".csv"
                                                onChange={(e) => handleFileUpload(day, e)}
                                            />
                                            <ScrollArea className="h-[320px] border rounded-lg p-2">
                                                {uploadedData[day] ? (
                                                    <div className="space-y-1">
                                                        {uploadedData[day].map((template, index) => {
                                                            const isSelected = selectedTemplates.some(t => t.day === template.day && t.time === template.time && t.event === template.event);
                                                            return (
                                                                <div 
                                                                    key={index}
                                                                    className={`p-1.5 border rounded-md text-xs cursor-pointer ${isSelected ? 'bg-primary/20 border-primary' : 'bg-background'}`}
                                                                    onClick={() => handleToggleTemplate(template)}
                                                                >
                                                                    <span className="font-bold">{template.time}</span> - {template.event} ({template.location || '위치 없음'})
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                        CSV 파일을 업로드하세요.
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </div>
                                    </TabsContent>
                                ))}
                             </Tabs>
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
