
"use client";

import { useState, useEffect, useRef } from 'react';
import { Trash2, User, Loader2, Plus, ImageIcon, Upload, X, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVenueData } from '@/hooks/use-venue-data';
import type { StaffMember, Role } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '../ui/input';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "@/components/ui/collapsible"
import { cn } from '@/lib/utils';
import { useDrop, DropTargetMonitor } from 'react-dnd';

interface PendingStaff {
    key: string;
    name: string;
    avatarDataUrl: string;
}

const MAX_IMAGE_WIDTH = 800; // 픽셀 단위

const ItemTypes = {
    ROLE: 'role',
}

const StaffMemberCard = ({ staff, index, selectedSlot }: { staff: StaffMember, index: number, selectedSlot: { day: number, time: string } | null }) => {
    const { deleteStaff, assignRoleToStaff, unassignRoleFromStaff } = useVenueData();
    const { toast } = useToast();
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.ROLE,
        drop: (item: Role) => {
            if (item.day !== selectedSlot?.day || item.time !== selectedSlot?.time) {
                toast({
                    variant: 'destructive',
                    title: '시간대 불일치',
                    description: `이 직책은 Day ${item.day} ${item.time} 전용입니다. Day ${selectedSlot?.day} ${selectedSlot?.time}의 스태프에게 할당할 수 없습니다.`,
                });
                return;
            }
            assignRoleToStaff(staff.id, item.id);
            toast({
                title: '직책 할당됨',
                description: `${staff.name}님에게 '${item.name}' 직책이 할당되었습니다.`,
            });
        },
        canDrop: (item: Role) => {
            return item.day === selectedSlot?.day && item.time === selectedSlot?.time;
        },
        collect: (monitor: DropTargetMonitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop() && monitor.getItem().day === selectedSlot?.day && monitor.getItem().time === selectedSlot?.time,
        }),
    }), [staff.id, selectedSlot]);


    const handleDelete = () => {
        deleteStaff(staff.id);
        toast({
          title: "삭제 완료",
          description: `${staff.name} 스태프와 모든 관련 데이터가 삭제되었습니다.`
        })
      setIsAlertOpen(false);
    };
    
    const handleUnassignRole = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (staff.role) {
            unassignRoleFromStaff(staff.id, staff.role.day, staff.role.time);
            toast({
                title: '직책 해제됨',
                description: `${staff.name}님의 직책이 해제되었습니다.`,
            });
        }
    };

    const showRole = staff.role && selectedSlot && staff.role.day === selectedSlot.day && staff.role.time === selectedSlot.time;

    return (
        <div 
            ref={drop}
            className={cn("relative group flex flex-col items-center gap-2 rounded-md border p-3 text-center transition-all",
                isOver && canDrop && "ring-2 ring-primary bg-primary/10",
                isOver && !canDrop && "ring-2 ring-destructive bg-destructive/10"
            )}
        >
            <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                {index + 1}
            </span>
             <Avatar className={cn('h-12 w-12', showRole && 'border-4 border-destructive')}>
                <AvatarImage src={staff.avatar} alt={staff.name} />
                <AvatarFallback><User className='h-6 w-6 text-muted-foreground'/></AvatarFallback>
            </Avatar>
            <div className='flex-1'>
                <p className="font-semibold text-sm">{staff.name}</p>
                {showRole && staff.role ? (
                     <Badge 
                        variant="outline"
                        className="mt-1 text-xs group/badge relative pr-6" 
                    >
                        {staff.role.name}
                        <button onClick={handleUnassignRole} className='absolute right-0.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover/badge:opacity-100 transition-opacity'>
                           <X className='h-3 w-3 mx-auto'/>
                        </button>
                    </Badge>
                ) : (
                    <div className='h-6 mt-1'/> 
                )}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => setIsAlertOpen(true)}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription>
                        이 작업은 되돌릴 수 없습니다. <span className="font-bold">{staff.name}</span> 스태프와 모든 관련 데이터가 영구적으로 삭제됩니다.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>삭제</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

interface StaffPanelProps {
    selectedSlot: { day: number, time: string } | null;
}

export function StaffPanel({ selectedSlot }: StaffPanelProps) {
  const { data, addStaffBatch, isLoading } = useVenueData();
  const { toast } = useToast();
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGridOpen, setIsGridOpen] = useState(true);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    return reject(new Error('Canvas context를 얻을 수 없습니다.'));
                }

                let { width, height } = img;
                if (width > MAX_IMAGE_WIDTH) {
                    height = (height * MAX_IMAGE_WIDTH) / width;
                    width = MAX_IMAGE_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG 형식으로 압축하여 데이터 URL 생성
                resolve(canvas.toDataURL('image/jpeg', 0.9)); 
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    toast({
      title: '이미지 처리 중...',
      description: `${files.length}개의 이미지를 리사이징하고 있습니다. 잠시만 기다려주세요.`,
    });

    try {
        const resizePromises = Array.from(files).map(file => resizeImage(file));
        const resizedDataUrls = await Promise.all(resizePromises);
        
        const newPendingStaff = resizedDataUrls.map((url, index) => ({
            key: `pending-${Date.now()}-${index}`,
            name: '',
            avatarDataUrl: url,
        }));

        setPendingStaff(prev => [...prev, ...newPendingStaff]);

        toast({
            title: '이미지 준비 완료',
            description: `${files.length}개의 이미지가 등록 대기 목록에 추가되었습니다.`,
        });

    } catch (error) {
        console.error("이미지 리사이징 실패:", error);
        toast({
            variant: 'destructive',
            title: '이미지 처리 실패',
            description: '이미지를 처리하는 중 오류가 발생했습니다.',
        });
    }
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };
  
  const updatePendingStaffName = (key: string, name: string) => {
    setPendingStaff(prev => prev.map(p => p.key === key ? { ...p, name } : p));
  };

  const removePendingStaff = (key: string) => {
    setPendingStaff(prev => prev.filter(p => p.key !== key));
  };

  const handleRegisterAll = async () => {
    const invalidStaff = pendingStaff.filter(p => p.name.trim() === '');
    if (invalidStaff.length > 0) {
        toast({
            variant: 'destructive',
            title: '이름 필요',
            description: '모든 등록 대기중인 스태프의 이름을 입력해야 합니다.',
        });
        return;
    }

    const newStaffMembers = pendingStaff.map(p => ({ name: p.name, avatar: p.avatarDataUrl }));
    await addStaffBatch(newStaffMembers);
    toast({
        title: '일괄 등록 완료',
        description: `${newStaffMembers.length}명의 스태프가 성공적으로 등록되었습니다.`
    });
    setPendingStaff([]);
  };

  const canRegister = pendingStaff.length > 0 && pendingStaff.every(p => p.name.trim() !== '');

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl font-semibold">스태프 관리</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <Collapsible open={isGridOpen} onOpenChange={setIsGridOpen}>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className='space-y-1.5'>
                <CardTitle className="font-headline text-2xl font-semibold">스태프 관리</CardTitle>
                <CardDescription>
                    총 <Badge variant="secondary">{data.staff.length}</Badge>명의 스태프가 등록되었습니다.
                </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                    </Button>
                </CollapsibleTrigger>
                <Button onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className='mr-2 h-4 w-4' />
                    이미지 추가
                </Button>
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                onChange={handleFileSelect} 
                accept="image/*"
            />
        </CardHeader>
        <CollapsibleContent>
            <CardContent className='space-y-6'>
                {pendingStaff.length > 0 && (
                    <div className='space-y-4 p-4 border rounded-lg bg-muted/20'>
                        <div className='flex justify-between items-center'>
                            <h4 className='font-semibold'>등록 대기중인 스태프</h4>
                            <Button 
                                onClick={handleRegisterAll}
                                disabled={!canRegister}
                            >
                               <Upload className='mr-2 h-4 w-4'/> {pendingStaff.length}명 스태프 등록하기
                            </Button>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                            {pendingStaff.map((p) => (
                                <div key={p.key} className='flex items-center gap-3 p-2 border rounded-md bg-background'>
                                    <Avatar>
                                        <AvatarImage src={p.avatarDataUrl} />
                                        <AvatarFallback><User /></AvatarFallback>
                                    </Avatar>
                                    <Input 
                                        placeholder='스태프 이름'
                                        value={p.name}
                                        onChange={(e) => updatePendingStaffName(p.key, e.target.value)}
                                        className='flex-grow'
                                    />
                                    <Button variant="ghost" size="icon" className='h-8 w-8 shrink-0' onClick={() => removePendingStaff(p.key)}>
                                        <X className='h-4 w-4'/>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.staff.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(theme(spacing.28),1fr))] gap-4 p-1">
                    {data.staff.map((s, index) => (
                        <StaffMemberCard key={s.id} staff={s} index={index} selectedSlot={selectedSlot} />
                    ))}
                    </div>
                ) : (
                     pendingStaff.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <User className="h-12 w-12 text-muted-foreground" />
                            <p className="mt-4 text-muted-foreground">등록된 스태프가 없습니다. 이미지를 추가하여 시작하세요.</p>
                        </div>
                    )
                )}
            </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

    
