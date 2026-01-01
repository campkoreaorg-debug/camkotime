

"use client";

import { useState, useMemo, useRef } from 'react';
import { Calendar, Users, Edit, Plus, UserCheck, Upload, Settings, Trash2, GripVertical, Search, X, User as UserIcon } from 'lucide-react';
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
import { ScheduleItem, StaffMember, Role, ScheduleTemplate, Category } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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

const DraggableRole = ({ role, category, assignedStaff, onDelete }: { role: Role, category: Category | undefined, assignedStaff: StaffMember[], onDelete: (role: Role) => void }) => {
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
                        {category && <Badge variant="outline" className='mt-1 text-xs'>{category.name}</Badge>}
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
                    <p className='text-xs text-muted-foreground/70'>스태프에게 드래그하여 배정</p>
                )}
            </div>
        </div>
    )
};


const days = [0, 1, 2, 3];

export function RolePanel({ selectedSlot }: RolePanelProps) {
    const { data, addRole, assignRoleToStaff, addCategory, updateCategory, deleteCategory, deleteRole } = useVenueData();
    const { toast } = useToast();

    // Modals
    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [isDeleteRoleAlertOpen, setIsDeleteRoleAlertOpen] = useState(false);
    
    // Create Role State
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleCategoryId, setNewRoleCategoryId] = useState<string>('');
    const [selectedTemplates, setSelectedTemplates] = useState<ScheduleTemplate[]>([]);
    
    // Uploaded Data State
    const [uploadedData, setUploadedData] = useState<Record<string, ScheduleTemplate[]>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Assign Role State
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [staffSearchTerm, setStaffSearchTerm] = useState('');
    
    // Category Manager State
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryName, setCategoryName] = useState('');
    
    // Role Deletion State
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    
    const categoriesWithAll: Category[] = useMemo(() => [{ id: 'all', name: '전체' }, ...data.categories], [data.categories]);
    
    const rolesForCurrentSlot = useMemo(() => {
        if (!selectedSlot) return [];
        return data.roles.filter(r => r.day === selectedSlot.day && r.time === selectedSlot.time);
    }, [data.roles, selectedSlot]);

    const handleFileUpload = (day: number, categoryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const key = `${day}-${categoryId}`;

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const templates = results.data.map((row, index): ScheduleTemplate | null => {
                    const time = row['시간'] || row['time'];
                    const event = row['이벤트'] || row['event'];
                    
                    if (time && event) {
                        const location = row['위치'] || row['location'];
                        return { day, time, event, location: location || '' };
                    }
                    return null;
                }).filter((t): t is ScheduleTemplate => t !== null);

                setUploadedData(prev => ({ ...prev, [key]: templates }));
                toast({ title: '업로드 완료', description: `${day}일차 '${data.categories.find(c=>c.id === categoryId)?.name}' 카테고리 스케줄 ${templates.length}개를 불러왔습니다.` });
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
        if (!newRoleCategoryId) {
            toast({ variant: 'destructive', title: '카테고리를 선택해주세요.' });
            return;
        }
        if (!selectedSlot) return;
        
        addRole(newRoleName, newRoleCategoryId, selectedSlot.day, selectedSlot.time, selectedTemplates);
        toast({ title: '성공', description: `새 직책 '${newRoleName}'이(가) 생성되었습니다.` });
        
        setIsCreateRoleModalOpen(false);
        setNewRoleName('');
        setNewRoleCategoryId('');
        setSelectedTemplates([]);
    };

    const handleAssignRole = () => {
        if (!selectedRoleId || selectedStaffIds.length === 0) {
            toast({ variant: 'destructive', title: '직책과 한 명 이상의 스태프를 선택해주세요.' });
            return;
        }
        staffIds.forEach(staffId => {
            assignRoleToStaff(staffId, selectedRoleId);
        });

        toast({ title: '성공', description: `${selectedStaffIds.length}명의 스태프에게 직책이 배정되었습니다.` });
        setIsAssignRoleModalOpen(false);
        setSelectedRoleId(null);
        setSelectedStaffIds([]);
        setStaffSearchTerm('');
    }
    
    const handleSaveCategory = () => {
        if (!categoryName.trim()) return;
        if (editingCategory) {
            updateCategory(editingCategory.id, categoryName);
        } else {
            addCategory(categoryName);
        }
        setEditingCategory(null);
        setCategoryName('');
    }

    const startEditingCategory = (category: Category) => {
        setEditingCategory(category);
        setCategoryName(category.name);
    }

    const cancelEditingCategory = () => {
        setEditingCategory(null);
        setCategoryName('');
    }
    
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

    const filteredStaff = useMemo(() => {
        return data.staff.filter(s => s.name.toLowerCase().includes(staffSearchTerm.toLowerCase()));
    }, [data.staff, staffSearchTerm]);

    const filteredRolesForAssign = useMemo(() => {
        if (!selectedSlot) return [];
        return data.roles.filter(r => r.day === selectedSlot.day && r.time === selectedSlot.time);
    }, [data.roles, selectedSlot]);

    const staffIds = selectedStaffIds; // Alias for clarity

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
                    <Button variant="ghost" size="sm" onClick={() => setIsCategoryManagerOpen(true)}><Settings className="mr-2 h-4 w-4"/>카테고리 관리</Button>
                    <Button variant="outline" onClick={() => setIsCreateRoleModalOpen(true)}><Plus className="mr-2 h-4 w-4"/>직책 생성</Button>
                </div>
            </CardHeader>
            <CardContent>
                {rolesForCurrentSlot.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                        {rolesForCurrentSlot.map(role => {
                            const category = data.categories.find(c => c.id === role.categoryId);
                            const assignedStaff = data.staff.filter(s => s.role?.id === role.id && s.role?.day === selectedSlot?.day && s.role?.time === selectedSlot?.time);
                            return <DraggableRole key={role.id} role={role} category={category} assignedStaff={assignedStaff} onDelete={openDeleteRoleDialog} />
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
                            이 시간대에만 적용되는 직책을 생성합니다. CSV로 스케줄 템플릿을 가져올 수 있습니다. CSV 파일은 '시간', '이벤트', '위치' 헤더를 포함해야 합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="role-name">직책 이름</Label>
                                <Input id="role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="예: 무대 보안팀" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role-category">카테고리</Label>
                                <Select onValueChange={setNewRoleCategoryId} value={newRoleCategoryId}>
                                    <SelectTrigger id="role-category">
                                        <SelectValue placeholder="직책의 카테고리를 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                        <Tabs defaultValue='all' className="w-full">
                                            <TabsList>
                                                {categoriesWithAll.map(cat => (
                                                    <TabsTrigger key={`cat-tab-create-${day}-${cat.id}`} value={cat.id}>{cat.name}</TabsTrigger>
                                                ))}
                                            </TabsList>
                                            {categoriesWithAll.map(cat => (
                                                <TabsContent key={`cat-content-create-${day}-${cat.id}`} value={cat.id}>
                                                    <div className="space-y-2">
                                                        {cat.id !== 'all' && (
                                                            <Button variant="outline" size="sm" onClick={() => fileInputRefs.current[`${day}-${cat.id}`]?.click()}>
                                                                <Upload className="mr-2 h-4 w-4" />
                                                                CSV 업로드
                                                            </Button>
                                                        )}
                                                        <input 
                                                            type="file" 
                                                            ref={el => fileInputRefs.current[`${day}-${cat.id}`] = el}
                                                            className="hidden"
                                                            accept=".csv"
                                                            onChange={(e) => handleFileUpload(day, cat.id, e)}
                                                        />
                                                        <ScrollArea className="h-[260px] border rounded-lg p-2">
                                                             {
                                                                (() => {
                                                                    const templatesToDisplay = cat.id === 'all' 
                                                                        ? data.categories.flatMap(c => uploadedData[`${day}-${c.id}`] || []) 
                                                                        : uploadedData[`${day}-${cat.id}`] || [];

                                                                    if (templatesToDisplay.length > 0) {
                                                                        return (
                                                                            <div className="space-y-1">
                                                                                {templatesToDisplay.map((template, index) => {
                                                                                    const isSelected = selectedTemplates.some(t => t.day === template.day && t.time === template.time && t.event === template.event);
                                                                                    return (
                                                                                        <div 
                                                                                            key={index}
                                                                                            className={`p-1.5 border rounded-md text-xs cursor-pointer ${isSelected ? 'bg-primary/20 border-primary' : 'bg-background'}`}
                                                                                            onClick={() => handleToggleTemplate(template)}
                                                                                        >
                                                                                            <span className="font-bold">{template.time || '시간없음'}</span> - {template.event} ({template.location || '위치 없음'})
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )
                                                                    }
                                                                    return (
                                                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                                                            {cat.id === 'all' ? '업로드된 스케줄이 없습니다.' : 'CSV 파일을 업로드하세요.'}
                                                                        </div>
                                                                    )
                                                                })()
                                                            }
                                                        </ScrollArea>
                                                    </div>
                                                </TabsContent>
                                            ))}
                                        </Tabs>
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

            {/* 직책 배정 모달 - This is currently not used due to DND but kept for potential future use */}
            <Dialog open={isAssignRoleModalOpen} onOpenChange={setIsAssignRoleModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>직책 배정 ({selectedSlot ? `Day ${selectedSlot.day}` : ''})</DialogTitle>
                        <DialogDescription>
                            스태프에게 직책을 배정합니다. 배정 시 해당 직책의 스케줄이 스태프에게 자동으로 할당됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className='space-y-2'>
                            <Label>1. 배정할 직책 선택</Label>
                             <Select onValueChange={setSelectedRoleId} value={selectedRoleId || ''}>
                                <SelectTrigger>
                                    <SelectValue placeholder="배정할 직책을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredRolesForAssign.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <Label>2. 배정할 스태프 선택 (다중 선택 가능)</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="스태프 이름으로 검색..."
                                    value={staffSearchTerm}
                                    onChange={(e) => setStaffSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <ScrollArea className="h-64 rounded-md border">
                                <div className="p-2 space-y-1">
                                    {filteredStaff.map(staff => (
                                        <div key={staff.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                            <Checkbox
                                                id={`staff-${staff.id}`}
                                                checked={selectedStaffIds.includes(staff.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                        ? setSelectedStaffIds([...selectedStaffIds, staff.id])
                                                        : setSelectedStaffIds(selectedStaffIds.filter(id => id !== staff.id))
                                                }}
                                            />
                                            <Label 
                                                htmlFor={`staff-${staff.id}`}
                                                className="flex-1 flex items-center gap-3 cursor-pointer"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={staff.avatar} alt={staff.name} />
                                                    <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium">{staff.name}</p>
                                                    <p className="text-xs text-muted-foreground">{staff.role?.name || '직책 없음'}</p>
                                                </div>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignRoleModalOpen(false)}>취소</Button>
                        <Button onClick={handleAssignRole} disabled={!selectedRoleId || selectedStaffIds.length === 0}>
                            {selectedStaffIds.length}명에게 직책 배정
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* 카테고리 관리 모달 */}
            <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>카테고리 관리</DialogTitle>
                        <DialogDescription>직책을 분류할 카테고리를 추가, 수정, 삭제합니다.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="flex gap-2">
                           <Input 
                                placeholder={editingCategory ? "카테고리 이름 수정..." : "새 카테고리 이름..."}
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                           />
                           <Button onClick={handleSaveCategory}>{editingCategory ? '수정' : '추가'}</Button>
                           {editingCategory && <Button variant="ghost" onClick={cancelEditingCategory}>취소</Button>}
                        </div>
                        <ScrollArea className="h-60 border rounded-md">
                           <div className="p-2 space-y-1">
                               {data.categories.map(cat => (
                                   <div key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                                       <div className='flex items-center gap-2'>
                                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                                          <span>{cat.name}</span>
                                       </div>
                                       <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditingCategory(cat)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>정말 이 카테고리를 삭제하시겠습니까?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            '{cat.name}' 카테고리가 영구적으로 삭제됩니다. 이 카테고리에 속한 모든 직책의 카테고리 정보가 초기화됩니다. 이 작업은 되돌릴 수 없습니다.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>취소</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteCategory(cat.id)} variant="destructive">삭제</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                       </div>
                                   </div>
                               ))}
                           </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button>닫기</Button>
                        </DialogClose>
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

    
