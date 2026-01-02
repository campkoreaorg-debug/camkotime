"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Plus, GripVertical, PlusCircle, Trash, Package, X, CheckCircle2, Circle, ListPlus } from 'lucide-react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';

import { Input } from '../ui/input';

import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Role, ScheduleTemplate } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ItemTypes } from './StaffPanel';
import { cn } from '@/lib/utils';


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
    const { data, addTasksToRole, removeTaskFromRole, updateScheduleStatus, addScheduleTemplatesToSlot } = useVenueData();
    const { toast } = useToast();

    const [isTemplateSelectModalOpen, setIsTemplateSelectModalOpen] = useState(false);

    const [manualTask, setManualTask] = useState('');
    
    const [selectedTasks, setSelectedTasks] = useState<ScheduleTemplate[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    
    const [roles, setRoles] = useState<Role[]>([]);

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

    const openTemplateSelector = () => {
        if (!data?.scheduleTemplates) return;
        
        const currentSlotRoles = roles.filter(r => r.day === selectedSlot?.day).map(r => r.name);
        
        const preSelected = data.scheduleTemplates.filter(t => currentSlotRoles.includes(t.name)).map(t => t.id);

        setSelectedTemplateIds(preSelected);
        setIsTemplateSelectModalOpen(true);
    };
    
    const handleSaveTemplatesToSlot = () => {
        if (!selectedSlot) return;
        addScheduleTemplatesToSlot(selectedTemplateIds, selectedSlot.day);
        toast({ title: '저장 완료', description: '선택한 포지션이 현재 날짜에 할당되었습니다.'});
        setIsTemplateSelectModalOpen(false);
    }
    
    const handleTemplateSelection = (templateId: string) => {
        setSelectedTemplateIds(prev => 
            prev.includes(templateId)
                ? prev.filter(id => id !== templateId)
                : [...prev, templateId]
        );
    }

    if (!selectedSlot) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-xl font-semibold">직책 및 업무 할당</CardTitle>
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
                    <Button variant="outline" onClick={openTemplateSelector}><ListPlus className="mr-2 h-4 w-4"/>이 시간대 필요 포지션 선택</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Role List */}
                    <div>
                        <h3 className="font-semibold text-md mb-2">1. 직책 선택</h3>
                        {dayFilteredRoles && dayFilteredRoles.length > 0 ? (
                             <ScrollArea className="h-96 pr-4">
                                <div className="space-y-2">
                                    {dayFilteredRoles.map((role) => (
                                        <div
                                            key={role.id}
                                            className={cn(
                                                "group p-3 rounded-md border bg-card flex justify-between items-start cursor-pointer transition-all hover:shadow-md",
                                                selectedRole?.id === role.id ? "border-primary shadow-md" : "hover:border-primary/50"
                                            )}
                                            onClick={() => handleSelectRole(role)}
                                        >
                                            <div className="flex items-start gap-3 flex-1">
                                                <Package className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm truncate flex items-center gap-2">
                                                        {role.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{(role.tasks || []).length}개 업무</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="text-center text-muted-foreground py-10 border rounded-lg h-96 flex items-center justify-center">
                                <p>'필요 포지션 선택'으로 직책을 추가하세요.</p>
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

            
            <Dialog open={isTemplateSelectModalOpen} onOpenChange={setIsTemplateSelectModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>이 시간대 필요 포지션 선택</DialogTitle>
                        <DialogDescription>
                            전체 직책 목록에서 현재 날짜({selectedSlot.day}일차)에 필요한 포지션을 선택하세요.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-96 my-4">
                         <div className='grid grid-cols-2 gap-2 p-2'>
                            {(data?.scheduleTemplates || []).map(template => (
                                <div key={template.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                                    <Checkbox
                                        id={`template-${template.id}`}
                                        checked={selectedTemplateIds.includes(template.id)}
                                        onCheckedChange={() => handleTemplateSelection(template.id)}
                                    />
                                    <label
                                        htmlFor={`template-${template.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {template.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                        <Button onClick={handleSaveTemplatesToSlot}>선택한 포지션 저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
