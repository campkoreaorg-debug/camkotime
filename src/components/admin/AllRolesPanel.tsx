"use client";

import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useVenueData } from '@/hooks/use-venue-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { ScheduleTemplate } from '@/lib/types';

export function AllRolesPanel() {
    const { data, addScheduleTemplate, updateScheduleTemplate, deleteScheduleTemplate } = useVenueData();
    const { toast } = useToast();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

    const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<ScheduleTemplate | null>(null);

    const [name, setName] = useState('');
    const [tasks, setTasks] = useState<{ event: string }[]>([]);
    const [currentTask, setCurrentTask] = useState('');

    const templates = useMemo(() => {
        return data?.scheduleTemplates || [];
    }, [data?.scheduleTemplates]);

    const resetForm = () => {
        setName('');
        setTasks([]);
        setCurrentTask('');
        setEditingTemplate(null);
    };

    const handleOpenCreateModal = () => {
        resetForm();
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (template: ScheduleTemplate) => {
        setEditingTemplate(template);
        setName(template.name);
        setTasks(template.tasks || []);
        setCurrentTask('');
        setIsEditModalOpen(true);
    };

    const handleOpenDeleteAlert = (template: ScheduleTemplate) => {
        setTemplateToDelete(template);
        setIsDeleteAlertOpen(true);
    };

    const handleAddTask = () => {
        if (currentTask.trim()) {
            setTasks([...tasks, { event: currentTask.trim() }]);
            setCurrentTask('');
        }
    };

    const handleRemoveTask = (index: number) => {
        setTasks(tasks.filter((_, i) => i !== index));
    };

    const handleSaveTemplate = () => {
        if (!name.trim()) {
            toast({ variant: 'destructive', title: '직책 이름을 입력해주세요.' });
            return;
        }

        if (editingTemplate) {
            updateScheduleTemplate(editingTemplate.id, { name, tasks });
            toast({ title: '성공', description: '직책 템플릿이 수정되었습니다.' });
            setIsEditModalOpen(false);
        } else {
            addScheduleTemplate(name, tasks);
            toast({ title: '성공', description: `새 직책 '${name}'이(가) 생성되었습니다.` });
            setIsCreateModalOpen(false);
        }
        resetForm();
    };

    const handleDeleteTemplate = () => {
        if (templateToDelete) {
            deleteScheduleTemplate(templateToDelete.id);
            toast({ title: '삭제 완료', description: `'${templateToDelete.name}' 직책이 삭제되었습니다.` });
        }
        setIsDeleteAlertOpen(false);
        setTemplateToDelete(null);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl font-semibold">전체 직책 관리 (템플릿)</CardTitle>
                    <CardDescription>
                        여기서 생성/수정한 직책은 모든 날짜에서 불러와 사용할 수 있는 템플릿입니다.
                    </CardDescription>
                </div>
                <Button variant="outline" onClick={handleOpenCreateModal}><Plus className="mr-2 h-4 w-4" />직책 생성</Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.length > 0 ? templates.map(template => (
                            <div key={template.id} className="p-4 border rounded-lg group relative">
                                <h4 className="font-bold text-md mb-2">{template.name}</h4>
                                <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                                    {(template.tasks || []).map((task, index) => (
                                        <li key={index}>{task.event}</li>
                                    ))}
                                    {(template.tasks || []).length === 0 && <li className="list-none text-gray-400">업무 없음</li>}
                                </ul>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditModal(template)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleOpenDeleteAlert(template)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full text-center text-muted-foreground py-10">
                                <p>생성된 직책 템플릿이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            {/* Create/Edit Dialog */}
            <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? '직책 수정' : '새 직책 생성'}</DialogTitle>
                        <DialogDescription>
                            직책의 이름과 기본 업무 목록을 관리합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="role-name">직책 이름</Label>
                            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 무대 보안팀" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-name">업무 목록</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="task-name"
                                    value={currentTask}
                                    onChange={(e) => setCurrentTask(e.target.value)}
                                    placeholder="업무 내용 입력 후 '추가'"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddTask();
                                        }
                                    }}
                                />
                                <Button type="button" variant="secondary" onClick={handleAddTask}>추가</Button>
                            </div>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                {tasks.map((task, index) => (
                                    <div key={index} className="flex items-center justify-between p-1.5 hover:bg-muted rounded-md">
                                        <span className="text-sm">{task.event}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveTask(index)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                {tasks.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">업무를 추가해주세요.</p>}
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">취소</Button></DialogClose>
                        <Button onClick={handleSaveTemplate}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Alert */}
            <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>정말 이 직책을 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                            '{templateToDelete?.name}' 직책 템플릿이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTemplate} variant="destructive">삭제</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}