
"use client";

import { useState, useMemo } from 'react';
import { Plus, Trash2, GripVertical, PlusCircle, Trash, Package, ClipboardCheck, X } from 'lucide-react';
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
import { useDrag } from 'react-dnd';
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

export function RolePanel({ selectedSlot }: { selectedSlot: { day: number, time: string } | null }) {
    const { data, addRole, deleteRole, addTasksToRole, removeTaskFromRole } = useVenueData();
    const { toast } = useToast();

    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isDeleteRoleAlertOpen, setIsDeleteRoleAlertOpen] = useState(false);
    
    const [newRoleName, setNewRoleName] = useState('');
    const [manualTask, setManualTask] = useState('');
    
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<ScheduleTemplate[]>([]);

    const handleCreateRole = () => {
        if (!newRoleName.trim()) {
            toast({ variant: 'destructive', title: '직책 이름을 입력해주세요.' });
            return;
        }
        addRole(newRoleName, manualTask ? [{ event: manualTask }] : []);
        toast({ title: '성공', description: `새 직책 '${newRoleName}'이(가) 생성되었습니다.` });
        
        setIsCreateRoleModalOpen(false);
        setNewRoleName('');
        setManualTask('');
    };

    const handleSelectRole = (role: Role) => {
        if(selectedRole?.id === role.id){
            setSelectedRole(null);
            setSelectedTasks([]);
        } else {
            setSelectedRole(role);
            setSelectedTasks([]);
        }
    }

    const handleToggleTask = (task: ScheduleTemplate) => {
        setSelectedTasks(prev => {
            const exists = prev.some(t => t.event === task.event);
            if (exists) {
                return prev.filter(t => t.event !== task.event);
            } else {
                return [...prev, task];
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
                setSelectedRole(null);
                setSelectedTasks([]);
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
        <Card className='xl:col-span-2'>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl font-semibold">직책 및 업무 할당</CardTitle>
                    <CardDescription>
                        직책을 선택하여 업무를 할당하세요. 총 <Badge variant="secondary">{data.roles?.length || 0}</Badge>개의 직책.
                    </CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(true)}><Plus className="mr-2 h-4 w-4"/>직책 생성</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Role List */}
                    <div>
                        <h3 className="font-semibold text-md mb-2">1. 직책 선택</h3>
                        {data.roles && data.roles.length > 0 ? (
                             <ScrollArea className="h-96 pr-4">
                                <div className="space-y-2">
                                    {data.roles.map(role => (
                                        <div key={role.id}
                                            className={cn(
                                                "group p-3 rounded-md border bg-card flex justify-between items-start cursor-pointer transition-all hover:shadow-md",
                                                selectedRole?.id === role.id ? "border-primary shadow-md" : "hover:border-primary/50"
                                            )}
                                            onClick={() => handleSelectRole(role)}
                                        >
                                            <div className="flex items-start gap-3 flex-1">
                                                <Package className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm truncate">{role.name}</p>
                                                    <p className="text-xs text-muted-foreground">{(role.tasks || []).length}개 업무</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 cursor-pointer shrink-0" onClick={(e) => {e.stopPropagation(); openDeleteRoleDialog(role)}}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="text-center text-muted-foreground py-10 border rounded-lg">
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
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRole(null)}>
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
                                                                <div>
                                                                    <span>{task.event}</span> {task.location && `(${task.location})`}
                                                                </div>
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleRemoveTask(task);}}>
                                                                <Trash className="h-3 w-3" />
                                                            </Button>
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
                                    <p className="text-sm">왼쪽에서 직책을 선택하여<br/>업무를 할당하세요.</p>
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
                            시간대에 관계 없이 사용할 수 있는 직책 템플릿을 만듭니다.
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
                        <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(false)}>취소</Button>
                        <Button onClick={handleCreateRole}>생성</Button>
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

    

    