

"use client";

import { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, GripVertical, Search, X, Upload, PlusCircle, Trash } from 'lucide-react';
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
    const [{ isDragging }, drag] = useDrag(() => ({
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
    const { data, addRole, deleteRole, addScheduleTemplate, deleteScheduleTemplate } = useVenueData();
    const { toast } = useToast();

    // Modals
    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isDeleteRoleAlertOpen, setIsDeleteRoleAlertOpen] = useState(false);
    
    // Create Role State
    const [newRoleName, setNewRoleName] = useState('');
    const [selectedTemplates, setSelectedTemplates] = useState<Omit<ScheduleTemplate, 'id'>[]>([]);
    const [manualTemplate, setManualTemplate] = useState({ event: '' });

    // Role Deletion State
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    
    const rolesForCurrentSlot = useMemo(() => {
        if (!selectedSlot || !data?.roles) return [];
        return data.roles.filter(r => r.day === selectedSlot.day && r.time === selectedSlot.time);
    }, [data, selectedSlot]);

    const templatesForCurrentSlot = useMemo(() => {
        if (!selectedSlot || !data?.scheduleTemplates) return [];
        return data.scheduleTemplates.filter(t => t.day === selectedSlot.day && t.time === selectedSlot.time);
    }, [data, selectedSlot]);


    const handleFileUpload = (day: number, time: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const templatesToAdd = results.data.map((row): Omit<ScheduleTemplate, 'id'> | null => {
                    const event = row['이벤트'] || row['event'];
                    const location = row['위치'] || row['location'] || '';
                    // CSV의 시간과 현재 선택된 시간이 같을 때만 추가
                    if (event && (row['시간'] || row['time']) === time) {
                        return { day, time, event, location };
                    }
                    return null;
                }).filter((t): t is Omit<ScheduleTemplate, 'id'> => t !== null);

                if (templatesToAdd.length > 0) {
                    addScheduleTemplate(templatesToAdd);
                    toast({ title: '업로드 완료', description: `${day}일차 ${time} 스케줄 템플릿 ${templatesToAdd.length}개를 추가했습니다.` });
                } else {
                    toast({ variant: 'destructive', title: '업로드 실패', description: `CSV 파일에 현재 시간대(${time})와 일치하는 스케줄이 없습니다.` });
                }
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
                const { id, ...rest } = template;
                return [...prev, rest];
            }
        });
    };

    const handleAddManualTemplate = (day: number, time: string) => {
        if (!manualTemplate.event.trim()) {
            toast({ variant: 'destructive', title: '이벤트 내용을 입력해주세요.' });
            return;
        }
        addScheduleTemplate([{ day, time, event: manualTemplate.event, location: '' }]);
        setManualTemplate({ event: '' });
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
        setManualTemplate({ event: '' });
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

    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl font-semibold">직책 관리</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>데이터 로딩 중...</p>
                </CardContent>
            </Card>
        )
    }

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
                            const assignedStaff = data.staff.filter(s => s.role?.id === role.id);
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
                                            {template.time} - {template.event}
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
                                        <TabsTrigger key={`day-tab-create-${day}`} value={`day-${day}`} disabled={selectedSlot?.day !== day}>Day {day}</TabsTrigger>
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
                                                    onChange={(e) => selectedSlot && handleFileUpload(day, selectedSlot.time, e)}
                                                />
                                            </div>
                                             <div className="flex gap-2 items-center p-2 border rounded-md">
                                                <Input 
                                                    placeholder="이벤트 내용 (Enter로 추가)" 
                                                    value={manualTemplate.event}
                                                    onChange={(e) => setManualTemplate(prev => ({ ...prev, event: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && selectedSlot) {
                                                            e.preventDefault();
                                                            handleAddManualTemplate(day, selectedSlot.time);
                                                        }
                                                    }}
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost"
                                                    onClick={() => selectedSlot && handleAddManualTemplate(day, selectedSlot.time)}
                                                >
                                                    <PlusCircle className="h-5 w-5" />
                                                </Button>
                                            </div>
                                            <ScrollArea className="h-[220px] border rounded-lg p-2">
                                                 {
                                                    templatesForCurrentSlot.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {templatesForCurrentSlot.map((template) => {
                                                                const isSelected = selectedTemplates.some(t => t.event === template.event && t.time === template.time);
                                                                return (
                                                                    <div 
                                                                        key={template.id}
                                                                        className={cn(
                                                                            "p-1.5 border rounded-md text-xs cursor-pointer flex items-center justify-between gap-2",
                                                                            isSelected ? 'bg-primary/20 border-primary' : 'bg-background'
                                                                        )}
                                                                        onClick={() => handleToggleTemplate(template)}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Checkbox checked={isSelected} className='shrink-0'/>
                                                                            <div>
                                                                                <span className="font-bold">{template.time || '시간없음'}</span> - {template.event} {template.location && `(${template.location})`}
                                                                            </div>
                                                                        </div>
                                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteScheduleTemplate(template.id);}}>
                                                                            <Trash className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                                            {selectedSlot ? `현재 시간대(${selectedSlot.time})에 맞는 스케줄 템플릿이 없습니다.` : '시간대를 선택하세요.'}
                                                        </div>
                                                    )
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
