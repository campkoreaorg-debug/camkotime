

"use client";

import { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, GripVertical, Search, X, Upload, PlusCircle } from 'lucide-react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { ScheduleItem, StaffMember, Role, ScheduleTemplate } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Papa from 'papaparse';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useDrag } from 'react-dnd';
import { cn } from '@/lib/utils';

const ItemTypes = {
    ROLE: 'role',
}

interface RolePanelProps {
    selectedSlot: { day: number, time: string } | null;
}

const DraggableRole = ({ role, assignedStaff, onDelete }: { role: Role, assignedStaff: StaffMember[], onDelete: (role: Role) => void }) => {
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: ItemTypes.ROLE,
        item: { id: role.id, name: role.name, day: role.day, time: role.time },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div 
            ref={drag}
            className="group p-3 rounded-md border bg-muted/30 flex flex-col justify-between cursor-grab active:cursor-grabbing min-h-[100px]"
            style={{ opacity: isDragging ? 0.5 : 1 }}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm truncate">{role.name}</p>
                    </div>
                </div>
                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 cursor-pointer shrink-0" onClick={() => onDelete(role)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
            <div className="mt-2 text-right">
                {assignedStaff.length > 0 ? (
                     <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        <div className="flex -space-x-2 overflow-hidden">
                          {assignedStaff.slice(0, 2).map(s => (
                              <Avatar key={s.id} className="h-5 w-5 inline-block border-2 border-background">
                                <AvatarImage src={s.avatar} />
                                <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className='font-semibold'>{assignedStaff.length}명 담당</span>
                    </div>
                ) : (
                    <p className='text-xs text-muted-foreground/70'>담당자 없음</p>
                )}
            </div>
        </div>
    )
};


const days = [0, 1, 2, 3];

export function RolePanel({ selectedSlot }: RolePanelProps) {
    const { data, addRole, assignRoleToStaff, deleteRole } = useVenueData();
    const { toast } = useToast();

    // Modals
    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isDeleteRoleAlertOpen, setIsDeleteRoleAlertOpen] = useState(false);
    
    // Create Role State
    const [newRoleName, setNewRoleName] = useState('');
    const [selectedTemplates, setSelectedTemplates] = useState<ScheduleTemplate[]>([]);
    
    // Uploaded Data & Manual Input State
    const [uploadedData, setUploadedData] = useState<Record<string, ScheduleTemplate[]>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [manualTemplate, setManualTemplate] = useState({ event: '', location: '' });

    // Role Deletion State
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    
    const rolesForCurrentSlot = useMemo(() => {
        if (!selectedSlot) return [];
        return data.roles.filter(r => r.day === selectedSlot.day && r.time === selectedSlot.time);
    }, [data.roles, selectedSlot]);

    const handleFileUpload = (day: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const key = `${day}`;

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const templates = results.data.map((row): ScheduleTemplate | null => {
                    const time = row['시간'] || row['time'];
                    const event = row['이벤트'] || row['event'];
                    
                    if (time && event) {
                        const location = row['위치'] || row['location'];
                        return { day, time, event, location: location || '' };
                    }
                    return null;
                }).filter((t): t is ScheduleTemplate => t !== null);

                setUploadedData(prev => ({ ...prev, [key]: [...(prev[key] || []), ...templates] }));
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

    const handleAddManualTemplate = (day: number, time: string) => {
        if (!manualTemplate.event.trim()) {
            toast({ variant: 'destructive', title: '이벤트 내용을 입력해주세요.' });
            return;
        }

        const newTemplate: ScheduleTemplate = {
            day,
            time,
            event: manualTemplate.event,
            location: manualTemplate.location || '',
        };

        const key = `${day}`;
        setUploadedData(prev => ({ ...prev, [key]: [...(prev[key] || []), newTemplate] }));
        setManualTemplate({ event: '', location: '' });
    };

    const handleCreateRole = () => {
        if (!newRoleName.trim()) {
            toast({ variant: 'destructive', title: '직책 이름을 입력해주세요.' });
            return;
        }
        if (!selectedSlot) return;
        
        addRole(newRoleName, selectedSlot.day, selectedSlot.time, selectedTemplates);
        toast({ title: '성공', description: `새 직책 '${newRoleName}'이(가) 생성되었습니다.` });
        
        setIsCreateRoleModalOpen(false);
        setNewRoleName('');
        setSelectedTemplates([]);
        setUploadedData({});
        setManualTemplate({ event: '', location: '' });
    };
    
    const openDeleteRoleDialog = (role: Role) => {
        setRoleToDelete(role);
        setIsDeleteRoleAlertOpen(true);
    };

    const handleDeleteRole = () => {
        if (roleToDelete) {
            deleteRole(roleToDelete.id);
            toast({ title: '삭제 완료', description: `'${roleToDelete.name}' 직책이 삭제되었습니다.` });
        }
        setIsDeleteRoleAlertOpen(false);
        setRoleToDelete(null);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl font-semibold">직책 관리</CardTitle>
                    <CardDescription>
                        {selectedSlot ? `Day ${selectedSlot.day} ${selectedSlot.time} | ` : ''}
                        총 <Badge variant="secondary">{rolesForCurrentSlot.length}</Badge>개의 직책. 스태프에게 드래그하세요.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(true)}><Plus className="mr-2 h-4 w-4"/>직책 생성</Button>
                </div>
            </CardHeader>
            <CardContent>
                {rolesForCurrentSlot.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                        {rolesForCurrentSlot.map(role => {
                            const assignedStaff = data.staff.filter(s => s.role?.id === role.id && s.role?.day === selectedSlot?.day && s.role?.time === selectedSlot?.time);
                            return <DraggableRole key={role.id} role={role} assignedStaff={assignedStaff} onDelete={openDeleteRoleDialog} />
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        <p>{selectedSlot ? `Day ${selectedSlot.day} ${selectedSlot.time}에 생성된 직책이 없습니다.` : '시간대를 선택하세요.'}</p>
                    </div>
                )}
            </CardContent>

            {/* 직책 생성 모달 */}
            <Dialog open={isCreateRoleModalOpen} onOpenChange={setIsCreateRoleModalOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>새 직책 생성 ({selectedSlot ? `Day ${selectedSlot.day} ${selectedSlot.time}` : ''})</DialogTitle>
                        <DialogDescription>
                            이 시간대에만 적용되는 직책을 생성합니다. CSV로 스케줄 템플릿을 가져오거나 직접 입력할 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="role-name">직책 이름</Label>
                                <Input id="role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="예: 무대 보안팀" />
                            </div>
                            
                            <div className='p-4 border rounded-lg bg-muted/20'>
                                <h4 className='font-semibold mb-2'>선택된 스케줄 템플릿: {selectedTemplates.length}개</h4>
                                <p className='text-xs text-muted-foreground mb-2'>템플릿을 선택하지 않아도 직책을 생성할 수 있습니다.</p>
                                <ScrollArea className='h-52'>
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
                             <Label>스케줄 템플릿 선택 (선택 사항)</Label>
                             <Tabs defaultValue={selectedSlot ? `day-${selectedSlot.day}` : 'day-0'}>
                                <TabsList className="grid w-full grid-cols-4">
                                    {days.map(day => (
                                        <TabsTrigger key={`day-tab-create-${day}`} value={`day-${day}`}>Day {day}</TabsTrigger>
                                    ))}
                                </TabsList>
                                {days.map(day => (
                                    <TabsContent key={`day-content-create-${day}`} value={`day-${day}`}>
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[`${day}`]?.click()}>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    CSV 업로드
                                                </Button>
                                                <input 
                                                    type="file" 
                                                    ref={el => fileInputRefs.current[`${day}`] = el}
                                                    className="hidden"
                                                    accept=".csv"
                                                    onChange={(e) => handleFileUpload(day, e)}
                                                />
                                            </div>
                                             <div className="flex gap-2 items-center p-2 border rounded-md">
                                                <Input 
                                                    placeholder="이벤트 내용" 
                                                    value={manualTemplate.event}
                                                    onChange={(e) => setManualTemplate(prev => ({ ...prev, event: e.target.value }))}
                                                />
                                                <Input 
                                                    placeholder="위치 (선택)" 
                                                    value={manualTemplate.location}
                                                    onChange={(e) => setManualTemplate(prev => ({ ...prev, location: e.target.value }))}
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost"
                                                    onClick={() => handleAddManualTemplate(day, selectedSlot?.time || '00:00')}
                                                >
                                                    <PlusCircle className="h-5 w-5" />
                                                </Button>
                                            </div>
                                            <ScrollArea className="h-[220px] border rounded-lg p-2">
                                                 {
                                                    (() => {
                                                        const allTemplatesForDay = uploadedData[`${day}`] || [];
                                                        const templatesToDisplay = selectedSlot 
                                                            ? allTemplatesForDay.filter(t => t.time === selectedSlot.time)
                                                            : allTemplatesForDay;

                                                        if (templatesToDisplay.length > 0) {
                                                            return (
                                                                <div className="space-y-1">
                                                                    {templatesToDisplay.map((template, index) => {
                                                                        const isSelected = selectedTemplates.some(t => t.day === template.day && t.time === template.time && t.event === template.event);
                                                                        return (
                                                                            <div 
                                                                                key={index}
                                                                                className={cn(
                                                                                    "p-1.5 border rounded-md text-xs cursor-pointer flex items-center gap-2",
                                                                                    isSelected ? 'bg-primary/20 border-primary' : 'bg-background'
                                                                                )}
                                                                                onClick={() => handleToggleTemplate(template)}
                                                                            >
                                                                                <Checkbox checked={isSelected} className='shrink-0'/>
                                                                                <div>
                                                                                    <span className="font-bold">{template.time || '시간없음'}</span> - {template.event} {template.location && `(${template.location})`}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )
                                                        }
                                                        return (
                                                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                                                {allTemplatesForDay.length > 0 ? `현재 시간대(${selectedSlot?.time})에 맞는 스케줄이 없습니다.` : 'CSV를 업로드하거나 직접 입력하세요.'}
                                                            </div>
                                                        )
                                                    })()
                                                }
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

            <AlertDialog open={isDeleteRoleAlertOpen} onOpenChange={setIsDeleteRoleAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 이 직책을 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                        '{roleToDelete?.name}' 직책이 영구적으로 삭제됩니다. 이 직책이 할당된 모든 스태프의 직책 정보와 관련 스케줄도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRole} variant="destructive">삭제</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
