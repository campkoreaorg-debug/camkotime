
"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical, PlusCircle, Trash, Package, ClipboardCheck, X, Upload, Download, ArrowDown, ArrowUp, CheckCircle2, Circle } from 'lucide-react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Role, ScheduleTemplate } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ItemTypes } from './StaffPanel';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

const DraggableRoleItem = ({ role, index, moveRole, onSelectRole, selectedRole, onDeleteRole, isAssigned }: { role: Role, index: number, moveRole: (dragIndex: number, hoverIndex: number) => void, onSelectRole: (role: Role) => void, selectedRole: Role | null, onDeleteRole: (role: Role) => void, isAssigned: boolean }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: 'ROLE',
        hover(item: { index: number }, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            moveRole(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: 'ROLE',
        item: { id: role.id, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <div
            ref={preview}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            className={cn(
                "group p-3 rounded-md border bg-card flex justify-between items-start cursor-pointer transition-all hover:shadow-md",
                selectedRole?.id === role.id ? "border-primary shadow-md" : "hover:border-primary/50"
            )}
            onClick={() => onSelectRole(role)}
        >
            <div className="flex items-start gap-3 flex-1">
                <div ref={ref} className="pt-0.5 cursor-move">
                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                <Package className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p className="font-semibold text-sm truncate flex items-center gap-2">
                        {role.name}
                        {isAssigned && <span className="text-xs text-destructive font-semibold">(배정됨)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{(role.tasks || []).length}개 업무</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 cursor-pointer shrink-0" onClick={(e) => { e.stopPropagation(); onDeleteRole(role) }}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
};


interface DraggableTaskBundleProps {
    role: Role;
    selectedTasks: ScheduleTemplate[];
}

const DraggableTaskBundle = ({ role, selectedTasks }: DraggableTaskBundleProps) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TASK_BUNDLE,
        item: { roleName: role.name, tasks: selectedTasks },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [role.name, selectedTasks]);

    return (
        <div ref={drag} className={cn(
            "p-3 rounded-lg border bg-primary text-primary-foreground cursor-grab active:cursor-grabbing shadow-lg",
            isDragging && "opacity-50"
        )}>
            <div className="flex items-center gap-3">
                <GripVertical className="h-5 w-5" />
                <div>
                    <p className="font-bold">{role.name}</p>
                    <p className="text-sm opacity-80">{selectedTasks.length}개 업무 선택됨</p>
                </div>
            </div>
        </div>
    );
};

interface RolePanelProps {
    selectedSlot: { day: number, time: string } | null;
    selectedRole: Role | null;
    onRoleSelect: (role: Role | null) => void;
}

function RolePanelInternal({ selectedSlot, selectedRole, onRoleSelect }: RolePanelProps) {
    const { data, addRole, deleteRole, addTasksToRole, removeTaskFromRole, uploadRoles, updateRoleOrder, importRolesFromOtherDays, updateScheduleStatus } = useVenueData();
    const { toast } = useToast();

    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isDeleteRoleAlertOpen, setIsDeleteRoleAlertOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    const [newRoleName, setNewRoleName] = useState('');
    const [manualTask, setManualTask] = useState('');
    
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<ScheduleTemplate[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [roles, setRoles] = useState<Role[]>([]);
    const [rolesToImport, setRolesToImport] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (data?.roles) {
            const sortedRoles = [...data.roles].sort((a, b) => {
                if (a.order !== undefined && b.order !== undefined) {
                    return a.order - b.order;
                }
                if (a.order !== undefined) return -1;
                if (b.order !== undefined) return 1;
                return (b.tasks?.length || 0) - (a.tasks?.length || 0);
            });
            setRoles(sortedRoles);
        }
    }, [data?.roles]);


    useEffect(() => {
        // When selected role changes from parent, clear task selection
        setSelectedTasks([]);
    }, [selectedRole]);


    const handleCreateRole = () => {
        if (!newRoleName.trim()) {
            toast({ variant: 'destructive', title: '직책 이름을 입력해주세요.' });
            return;
        }
        if (!selectedSlot) {
            toast({ variant: 'destructive', title: '오류', description: '시간대를 먼저 선택해주세요.' });
            return;
        }
        addRole(newRoleName, manualTask ? [{ event: manualTask }] : [], selectedSlot.day);
        toast({ title: '성공', description: `새 직책 '${newRoleName}'이(가) 생성되었습니다.` });
        
        // Don't close modal, just clear inputs for next entry
        setNewRoleName('');
        setManualTask('');
    };

    const handleSelectRole = (role: Role) => {
        if(selectedRole?.id === role.id){
            onRoleSelect(null);
        } else {
            onRoleSelect(role);
        }
    }

    const handleToggleTask = (task: ScheduleTemplate) => {
        setSelectedTasks(prev => {
            const exists = prev.some(t => t.event === task.event);
            if (exists) {
                return prev.filter(t => t.event !== task.event);
            } else {
                return [...prev, { ...task }];
            }
        });
    };
    
    const openDeleteRoleDialog = (role: Role) => {
        setRoleToDelete(role);
        setIsDeleteRoleAlertOpen(true);
    };

    const handleDeleteRole = () => {
        if (roleToDelete) {
            if (selectedRole?.id === roleToDelete.id) {
                onRoleSelect(null);
            }
            deleteRole(roleToDelete.id);
            toast({ title: '삭제 완료', description: `'${roleToDelete.name}' 직책이 삭제되었습니다.` });
        }
        setIsDeleteRoleAlertOpen(false);
        setRoleToDelete(null);
    };

    const handleAddTask = () => {
        if (!manualTask.trim() || !selectedRole) return;
        addTasksToRole(selectedRole.id, [{ event: manualTask }]);
        setManualTask('');
    };

    const handleRemoveTask = (task: ScheduleTemplate) => {
        if (!selectedRole) return;
        removeTaskFromRole(selectedRole.id, task);
    };
    
    const relevantSchedules = useMemo(() => {
        if (!selectedRole || !selectedSlot || !data?.schedule) return [];
        return data.schedule.filter(s =>
            s.day === selectedSlot.day &&
            s.roleName === selectedRole.name
        );
    }, [selectedRole, selectedSlot, data?.schedule]);

    const taskCompletionStatus = useMemo(() => {
        if (!selectedRole || !relevantSchedules) return new Map<string, boolean>();

        const statusMap = new Map<string, boolean>();
        for (const task of selectedRole.tasks) {
            const schedulesForTask = relevantSchedules.filter(s => s.event === task.event);
            if (schedulesForTask.length > 0) {
                const allCompleted = schedulesForTask.every(s => s.isCompleted);
                statusMap.set(task.event, allCompleted);
            } else {
                statusMap.set(task.event, false);
            }
        }
        return statusMap;
    }, [selectedRole, relevantSchedules]);

    const handleToggleCompletion = useCallback((task: ScheduleTemplate) => {
        if (!selectedRole || !selectedSlot || !data?.schedule) return;

        const schedulesToUpdate = data.schedule.filter(s => 
            s.day === selectedSlot.day &&
            s.roleName === selectedRole.name &&
            s.event === task.event
        );
        
        if (schedulesToUpdate.length === 0) return;

        const areAllCompleted = schedulesToUpdate.every(s => s.isCompleted);
        const newStatus = !areAllCompleted;
        const scheduleIdsToUpdate = schedulesToUpdate.map(s => s.id);

        updateScheduleStatus(scheduleIdsToUpdate, newStatus);
        
    }, [selectedRole, selectedSlot, data?.schedule, updateScheduleStatus]);

    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedSlot) return;

        Papa.parse(file, {
            complete: (results) => {
                const parsedData = results.data as string[][];
                if (parsedData.length < 1) {
                    toast({ variant: 'destructive', title: '잘못된 CSV 형식', description: '파일에 데이터가 없습니다.' });
                    return;
                }

                const roleNames = parsedData[0];
                
                const roles: Role[] = roleNames.map((name, colIndex) => {
                    const tasks: ScheduleTemplate[] = [];
                    if(name && name.trim() !== '') {
                        for (let rowIndex = 1; rowIndex < parsedData.length; rowIndex++) {
                            const event = parsedData[rowIndex][colIndex];
                            if (event && event.trim() !== '') {
                                tasks.push({ event });
                            }
                        }
                    }
                    return { id: `temp-id-${colIndex}`, name, tasks }; 
                }).filter(role => role.name && role.name.trim() !== '');
                
                uploadRoles(roles, selectedSlot.day);
                toast({ title: '업로드 완료', description: `${roles.length}개의 직책과 업무가 업로드되었습니다.` });
            },
            error: (error) => {
                toast({ variant: 'destructive', title: 'CSV 파싱 오류', description: error.message });
            }
        });

        if(event.target) event.target.value = '';
    };

    const handleDownload = () => {
        if (!data || !data.roles || data.roles.length === 0) {
            toast({ variant: 'destructive', title: '데이터 없음', description: '다운로드할 직책 데이터가 없습니다.' });
            return;
        }

        const rolesToDownload = data.roles;
        const header = rolesToDownload.map(r => r.name);
        
        const maxTasks = Math.max(0, ...rolesToDownload.map(r => (r.tasks || []).length));

        const rows: string[][] = [];
        for (let i = 0; i < maxTasks; i++) {
            rows.push(rolesToDownload.map(r => (r.tasks && r.tasks[i]) ? r.tasks[i].event : ''));
        }

        const csvData = [header, ...rows];
        const csv = Papa.unparse(csvData);

        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "venue_roles.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const moveRole = (dragIndex: number, hoverIndex: number) => {
        setRoles(prev => {
            const newRoles = [...prev];
            const [draggedItem] = newRoles.splice(dragIndex, 1);
            newRoles.splice(hoverIndex, 0, draggedItem);
            return newRoles;
        });
    };

    const handleDragEnd = () => {
        const roleIdsInOrder = roles.map(r => r.id);
        updateRoleOrder(roleIdsInOrder);
    };

    const handleToggleImportCheckbox = (roleId: string) => {
        setRolesToImport(prev => ({ ...prev, [roleId]: !prev[roleId] }));
    };

    const handleImportRoles = () => {
        if (!selectedSlot) {
            toast({ variant: 'destructive', title: '날짜 선택 필요', description: '먼저 작업할 날짜와 시간대를 선택해주세요.' });
            return;
        }
        const rolesToImportIds = Object.keys(rolesToImport).filter(id => rolesToImport[id]);
        if (rolesToImportIds.length === 0) {
            toast({ variant: 'destructive', title: '선택된 직책 없음', description: '불러올 직책을 하나 이상 선택해주세요.' });
            return;
        }
        
        importRolesFromOtherDays(rolesToImportIds, selectedSlot.day);
        
        toast({ title: '불러오기 완료', description: `${rolesToImportIds.length}개의 직책을 현재 날짜로 불러왔습니다.` });
        setIsImportModalOpen(false);
        setRolesToImport({});
    };

    const rolesByDay = useMemo(() => {
        if (!data?.allRoles) return {};
        return data.allRoles.reduce((acc, role) => {
            const day = role.day ?? 0;
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(role);
            return acc;
        }, {} as Record<number, Role[]>);
    }, [data?.allRoles]);

    const assignedRoleNamesInSlot = useMemo(() => {
        if (!data?.schedule || !selectedSlot) return new Set();
        
        const names = new Set<string>();
        data.schedule.forEach(s => {
            if (s.day === selectedSlot.day && s.time === selectedSlot.time && s.roleName) {
                names.add(s.roleName);
            }
        });
        return names;
    }, [data?.schedule, selectedSlot]);


    if (!data || !selectedSlot) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl font-semibold">직책 관리</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>상단에서 날짜와 시간대를 선택하세요.</p>
                </CardContent>
            </Card>
        )
    }
    
    const dayFilteredRoles = roles.filter(role => role.day === selectedSlot.day);

    return (
        <Card className='xl:col-span-2'>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl font-semibold">직책 및 업무 할당</CardTitle>
                    <CardDescription>
                        직책을 선택하여 업무를 할당하세요. 현재 날짜에 <Badge variant="secondary">{dayFilteredRoles?.length || 0}</Badge>개의 직책.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}><Download className="mr-2 h-4 w-4"/>직책 불러오기</Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4"/>직책 업로드</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                    <Button variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4"/>다운로드</Button>
                    <Button variant="outline" onClick={() => { setIsCreateRoleModalOpen(true); setNewRoleName(''); setManualTask(''); }}><Plus className="mr-2 h-4 w-4"/>직책 생성</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Role List */}
                    <div onMouseUp={handleDragEnd}>
                        <h3 className="font-semibold text-md mb-2">1. 직책 선택 (드래그로 순서 변경)</h3>
                        {dayFilteredRoles && dayFilteredRoles.length > 0 ? (
                             <ScrollArea className="h-96 pr-4">
                                <div className="space-y-2">
                                    {dayFilteredRoles.map((role, index) => (
                                        <DraggableRoleItem 
                                            key={role.id} 
                                            role={role} 
                                            index={index} 
                                            moveRole={moveRole}
                                            onSelectRole={handleSelectRole}
                                            selectedRole={selectedRole}
                                            onDeleteRole={openDeleteRoleDialog}
                                            isAssigned={assignedRoleNamesInSlot.has(role.name)}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="text-center text-muted-foreground py-10 border rounded-lg h-96 flex items-center justify-center">
                                <p>생성된 직책이 없습니다.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Right Column: Task List & Draggable Bundle */}
                    <div>
                        <h3 className="font-semibold text-md mb-2">2. 업무 선택 후 스태프에게 드래그</h3>
                         <div className="p-4 border rounded-lg h-96 flex flex-col">
                            {selectedRole ? (
                                <div className='space-y-4 h-full flex flex-col'>
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-primary">{selectedRole.name}</h4>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRoleSelect(null)}>
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <Input 
                                            placeholder="새 업무 추가 (Enter로 등록)" 
                                            value={manualTask}
                                            onChange={(e) => setManualTask(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTask();
                                                }
                                            }}
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleAddTask}>
                                            <PlusCircle className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <ScrollArea className="flex-grow pr-2">
                                        {selectedRole.tasks && selectedRole.tasks.length > 0 ? (
                                            <div className="space-y-1">
                                                {selectedRole.tasks.map((task, index) => {
                                                    const isSelected = selectedTasks.some(t => t.event === task.event);
                                                    const isCompleted = taskCompletionStatus.get(task.event) || false;
                                                    
                                                    return (
                                                        <div 
                                                            key={index}
                                                            className={cn(
                                                                "p-1.5 border rounded-md text-xs cursor-pointer flex items-center justify-between gap-2",
                                                                isSelected ? 'bg-primary/20 border-primary' : 'bg-background'
                                                            )}
                                                            onClick={() => handleToggleTask(task)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox checked={isSelected} className='shrink-0'/>
                                                                <div className={cn(isCompleted && 'line-through text-muted-foreground')}>
                                                                    <span>{task.event}</span> {task.location && `(${task.location})`}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button 
                                                                    size="sm" 
                                                                    variant={isCompleted ? "secondary" : "outline"} 
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleCompletion(task); }}
                                                                >
                                                                    {isCompleted ? '완료취소' : '완료'}
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleRemoveTask(task);}}>
                                                                    <Trash className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                                <p>추가된 업무가 없습니다.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                    
                                    {selectedRole && selectedTasks.length > 0 && (
                                        <div className='flex flex-col items-center gap-2 pt-2 border-t'>
                                            <DraggableTaskBundle role={selectedRole} selectedTasks={selectedTasks} />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                                    <p className="text-sm">왼쪽에서 직책을 선택하거나<br/>스태프를 클릭하여 업무를 할당하세요.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>

            <Dialog open={isCreateRoleModalOpen} onOpenChange={setIsCreateRoleModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>새 직책 생성</DialogTitle>
                        <DialogDescription>
                            현재 선택된 날짜({selectedSlot.day}일차)에 사용할 수 있는 직책 템플릿을 만듭니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role-name" className="text-right">직책 이름</Label>
                            <Input id="role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} className="col-span-3" placeholder="예: 무대 보안팀"/>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="task-name" className="text-right">초기 업무</Label>
                            <Input id="task-name" value={manualTask} onChange={(e) => setManualTask(e.target.value)} className="col-span-3" placeholder="예: 무대 주변 순찰 (선택사항)"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(false)}>닫기</Button>
                        <Button onClick={handleCreateRole}>생성</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>다른 날짜에서 직책 불러오기</DialogTitle>
                        <DialogDescription>
                            다른 날짜에 생성된 직책들을 선택하여 현재 날짜({selectedSlot.day}일차)로 복사합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-96 my-4">
                        <Accordion type="multiple" className="w-full" defaultValue={['day-0', 'day-1', 'day-2', 'day-3']}>
                            {Object.entries(rolesByDay).map(([day, dayRoles]) => (
                                <AccordionItem value={`day-${day}`} key={`${day}-${dayRoles.map(r=>r.id).join('-')}`}>
                                    <AccordionTrigger>{parseInt(day) + 1}일차</AccordionTrigger>
                                    <AccordionContent>
                                        <div className='grid grid-cols-2 gap-2 p-2'>
                                            {dayRoles.map(role => (
                                                <div key={`${day}-${role.id}`} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                                                    <Checkbox
                                                        id={`import-${role.id}`}
                                                        checked={rolesToImport[role.id] || false}
                                                        onCheckedChange={() => handleToggleImportCheckbox(role.id)}
                                                    />
                                                    <label
                                                        htmlFor={`import-${role.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        {role.name} <span className='text-muted-foreground'>({role.tasks?.length || 0}개 업무)</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>취소</Button>
                        <Button onClick={handleImportRoles}>선택한 직책 불러오기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <AlertDialog open={isDeleteRoleAlertOpen} onOpenChange={setIsDeleteRoleAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 이 직책을 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                        '{roleToDelete?.name}' 직책이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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

export function RolePanel(props: RolePanelProps) {
    return (
        <DndProvider backend={HTML5Backend}>
            <RolePanelInternal {...props} />
        </DndProvider>
    )
}

    